import { useEffect, useMemo, useState } from "react";
import "./App.css";

const API_BASE_URL = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/$/, "");
const API_URL = `${API_BASE_URL}/api/students`;
const DEFAULT_COURSES = ["BCA", "BSc IT", "BSc Computer Science", "MCA"];

function initials(name = "Student") {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "ST";
}

function csvSafe(value = "") {
  const text = String(value);
  const guarded = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${guarded.replace(/"/g, '""')}"`;
}

function App() {
  const [students, setStudents] = useState([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [course, setCourse] = useState("BCA");
  const [search, setSearch] = useState("");
  const [courseFilter, setCourseFilter] = useState("All courses");
  const [sortBy, setSortBy] = useState("name");
  const [sortDirection, setSortDirection] = useState("asc");
  const [editingId, setEditingId] = useState(null);
  const [activeView, setActiveView] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function loadStudents(showLoader = true) {
    if (showLoader) setLoading(true);
    try {
      const response = await fetch(API_URL);
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.message || "Could not load student records.");
      if (!Array.isArray(data)) throw new Error("The student API returned an unexpected response.");
      setStudents(data);
      setError("");
    } catch (err) {
      setError(err.message || "Could not connect to the backend. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStudents();
  }, []);

  const courses = useMemo(() => {
    const all = new Set([...DEFAULT_COURSES, ...students.map((student) => student.course).filter(Boolean)]);
    return [...all];
  }, [students]);

  const courseCounts = useMemo(
    () => courses.map((courseName) => ({
      name: courseName,
      count: students.filter((student) => student.course === courseName).length,
    })),
    [courses, students]
  );

  const activeCourses = courseCounts.filter((item) => item.count > 0).length;

  const filteredStudents = useMemo(() => {
    const query = search.trim().toLowerCase();
    return students
      .filter((student) => {
        const matchesSearch = `${student.name || ""} ${student.email || ""} ${student.course || ""}`
          .toLowerCase()
          .includes(query);
        const matchesCourse = courseFilter === "All courses" || student.course === courseFilter;
        return matchesSearch && matchesCourse;
      })
      .sort((a, b) => {
        const first = String(a[sortBy] || "").toLowerCase();
        const second = String(b[sortBy] || "").toLowerCase();
        return first.localeCompare(second) * (sortDirection === "asc" ? 1 : -1);
      });
  }, [students, search, courseFilter, sortBy, sortDirection]);

  function resetForm() {
    setName("");
    setEmail("");
    setCourse("BCA");
    setEditingId(null);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setNotice("");

    const cleanedName = name.trim();
    const cleanedEmail = email.trim().toLowerCase();
    if (!cleanedName || !cleanedEmail) {
      setError("Please enter both a student name and email address.");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(editingId ? `${API_URL}/${editingId}` : API_URL, {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: cleanedName, email: cleanedEmail, course }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "Could not save student.");

      setNotice(editingId ? "Student details updated successfully." : "Student added successfully.");
      resetForm();
      await loadStudents(false);
    } catch (err) {
      setError(err.message || "Could not save student. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  function handleEdit(student) {
    setEditingId(student._id);
    setName(student.name || "");
    setEmail(student.email || "");
    setCourse(student.course || "BCA");
    setNotice("");
    setError("");
    setActiveView("students");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this student record? This action cannot be undone.")) return;
    setError("");
    setNotice("");
    try {
      const response = await fetch(`${API_URL}/${id}`, { method: "DELETE" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "Could not delete student.");
      setNotice("Student record deleted.");
      await loadStudents(false);
    } catch (err) {
      setError(err.message || "Could not delete student. Please try again.");
    }
  }

  function exportCsv() {
    const header = ["Name", "Email", "Course"];
    const rows = filteredStudents.map((student) => [student.name, student.email, student.course]);
    const csv = [header, ...rows].map((row) => row.map(csvSafe).join(",")).join("\r\n");
    const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "student-records.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setNotice("CSV export downloaded.");
  }

  function startAddingStudent() {
    resetForm();
    setError("");
    setNotice("");
    setActiveView("students");
  }

  function selectCourse(courseName) {
    setCourseFilter(courseName);
    setActiveView("students");
  }

  const pageTitle = activeView === "students" ? "Student management" : activeView === "courses" ? "Courses" : "Overview";

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-lockup">
          <div className="brand-icon">S<span>+</span></div>
          <div className="brand-text"><strong>CampusFlow</strong><small>STUDENT PORTAL</small></div>
        </div>

        <div className="sidebar-label">WORKSPACE</div>
        <nav className="main-nav" aria-label="Main navigation">
          <button className={activeView === "overview" ? "nav-item active" : "nav-item"} onClick={() => setActiveView("overview")}>
            <span className="nav-symbol">◫</span> Overview
          </button>
          <button className={activeView === "students" ? "nav-item active" : "nav-item"} onClick={() => setActiveView("students")}>
            <span className="nav-symbol">♙</span> Students <span className="nav-count">{students.length}</span>
          </button>
          <button className={activeView === "courses" ? "nav-item active" : "nav-item"} onClick={() => setActiveView("courses")}>
            <span className="nav-symbol">▤</span> Courses
          </button>
        </nav>

        <div className="sidebar-bottom">
          <div className="help-card">
            <div className="help-icon">✦</div>
            <strong>Keep everything in sync</strong>
            <p>Your student records are stored in the cloud database.</p>
            <span className="connection-pill"><span /> Cloud database connected</span>
          </div>
          <div className="profile-row">
            <div className="profile-avatar">AD</div>
            <div className="profile-meta"><strong>Administrator</strong><small>Workspace owner</small></div>
            <span className="profile-dots">•••</span>
          </div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumbs"><span>Workspace</span><span className="crumb-slash">/</span><strong>{pageTitle}</strong></div>
          <div className="topbar-right"><span className="today-label">STUDENT ADMINISTRATION</span><div className="topbar-avatar">AD</div></div>
        </header>

        <div className="page-content">
          <section className="welcome-row">
            <div>
              <div className="eyebrow"><span className="eyebrow-dot" /> STUDENT INFORMATION SYSTEM</div>
              <h1>{activeView === "overview" ? "Good to see you again." : activeView === "students" ? "Manage your students." : "Explore your courses."}</h1>
              <p className="page-subtitle">
                {activeView === "overview" ? "Here’s what’s happening with your student community." : activeView === "students" ? "Keep student details organised, searchable, and up to date." : "Review course enrolments and jump straight to a course roster."}
              </p>
            </div>
            <button className="primary-button welcome-action" onClick={startAddingStudent}><span>＋</span> Add student</button>
          </section>

          {error && <div className="alert alert-error" role="alert"><span>!</span><div><strong>Something needs attention</strong><p>{error}</p></div><button className="alert-dismiss" onClick={() => setError("")} aria-label="Dismiss error">×</button></div>}
          {notice && <div className="alert alert-success" role="status"><span>✓</span><div><strong>{notice}</strong></div><button className="alert-dismiss" onClick={() => setNotice("")} aria-label="Dismiss message">×</button></div>}

          <section className="stats-grid" aria-label="Student statistics">
            <article className="stat-card stat-primary">
              <div className="stat-top"><span>Total students</span><span className="stat-icon">♙</span></div>
              <div className="stat-number">{loading ? "—" : students.length}</div>
              <div className="stat-foot"><span className="mini-trend">↗</span> Records in your database</div>
              <div className="stat-decoration" />
            </article>
            <article className="stat-card">
              <div className="stat-top"><span>Active courses</span><span className="stat-icon icon-violet">▤</span></div>
              <div className="stat-number">{loading ? "—" : activeCourses}</div>
              <div className="stat-foot">Courses with enrolments</div>
            </article>
            <article className="stat-card">
              <div className="stat-top"><span>Available courses</span><span className="stat-icon icon-amber">✦</span></div>
              <div className="stat-number">{courses.length}</div>
              <div className="stat-foot">Courses available to select</div>
            </article>
            <article className="stat-card">
              <div className="stat-top"><span>Matching records</span><span className="stat-icon icon-teal">⌕</span></div>
              <div className="stat-number">{loading ? "—" : filteredStudents.length}</div>
              <div className="stat-foot">Based on your current filters</div>
            </article>
          </section>

          {activeView === "overview" && (
            <div className="overview-grid">
              <section className="content-card course-overview-card">
                <div className="section-heading"><div><span className="section-kicker">ACADEMIC OVERVIEW</span><h2>Course distribution</h2><p>Enrolment count for each available course.</p></div><button className="text-button" onClick={() => setActiveView("courses")}>View all courses <span>→</span></button></div>
                <div className="course-bars">
                  {courseCounts.map((item, index) => {
                    const percent = students.length ? Math.round((item.count / students.length) * 100) : 0;
                    return <button className="course-bar-row" key={item.name} onClick={() => selectCourse(item.name)}>
                      <span className={`course-mark mark-${index % 4}`}>{item.name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2)}</span>
                      <span className="course-bar-info"><span className="course-bar-title">{item.name}</span><span className="progress-track"><span className={`progress-fill fill-${index % 4}`} style={{ width: `${percent}%` }} /></span></span>
                      <span className="course-bar-count">{item.count}<small>{percent}%</small></span>
                    </button>;
                  })}
                </div>
              </section>

              <section className="content-card quick-actions-card">
                <div className="section-heading"><div><span className="section-kicker">QUICK ACTIONS</span><h2>Work faster</h2><p>Common tasks in one place.</p></div></div>
                <button className="quick-action" onClick={startAddingStudent}><span className="quick-action-icon quick-blue">＋</span><span><strong>Register a student</strong><small>Add a new student record</small></span><span className="quick-arrow">→</span></button>
                <button className="quick-action" onClick={() => setActiveView("students")}><span className="quick-action-icon quick-purple">⌕</span><span><strong>Find a student</strong><small>Search the student directory</small></span><span className="quick-arrow">→</span></button>
                <button className="quick-action" onClick={exportCsv}><span className="quick-action-icon quick-green">↓</span><span><strong>Export records</strong><small>Download the current list as CSV</small></span><span className="quick-arrow">→</span></button>
                <div className="sync-note"><span className="sync-dot" /> Connected to your deployed API</div>
              </section>

              <section className="content-card preview-card">
                <div className="section-heading"><div><span className="section-kicker">DIRECTORY PREVIEW</span><h2>Students</h2><p>A quick look at the records in your system.</p></div><button className="text-button" onClick={() => setActiveView("students")}>Manage students <span>→</span></button></div>
                <StudentTable students={students.slice(0, 5)} loading={loading} onEdit={handleEdit} onDelete={handleDelete} compact />
              </section>
            </div>
          )}

          {activeView === "students" && (
            <div className="management-grid">
              <section className="content-card student-form-card">
                <div className="section-heading"><div><span className="section-kicker">STUDENT DETAILS</span><h2>{editingId ? "Edit student" : "Add a student"}</h2><p>{editingId ? "Update the selected student’s information." : "Enter the details to create a student record."}</p></div><span className="form-step">{editingId ? "EDIT" : "NEW"}</span></div>
                <form onSubmit={handleSubmit} className="modern-form">
                  <label>Full name<input type="text" placeholder="e.g. Aisha Khan" value={name} onChange={(event) => setName(event.target.value)} maxLength={100} required /></label>
                  <label>Email address<input type="email" placeholder="student@example.com" value={email} onChange={(event) => setEmail(event.target.value)} maxLength={254} required /></label>
                  <label>Course<select value={course} onChange={(event) => setCourse(event.target.value)}>{courses.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
                  <div className="form-actions"><button className="primary-button" type="submit" disabled={saving}>{saving ? "Saving…" : editingId ? "Save changes" : "+ Add student"}</button>{editingId && <button className="secondary-button" type="button" onClick={resetForm}>Cancel</button>}</div>
                </form>
                <div className="privacy-note"><span>🔒</span><p>Student details are sent to your backend API and stored in MongoDB Atlas.</p></div>
              </section>

              <section className="content-card directory-card">
                <div className="section-heading directory-heading"><div><span className="section-kicker">RECORD MANAGEMENT</span><h2>Student directory</h2><p>Search, filter, sort, and manage your records.</p></div><button className="secondary-button export-button" onClick={exportCsv}>↓ Export CSV</button></div>
                <div className="directory-toolbar"><label className="search-box"><span>⌕</span><input type="search" aria-label="Search students" placeholder="Search by name, email, or course…" value={search} onChange={(event) => setSearch(event.target.value)} /></label><select aria-label="Filter by course" className="toolbar-select" value={courseFilter} onChange={(event) => setCourseFilter(event.target.value)}><option>All courses</option>{courses.map((item) => <option key={item} value={item}>{item}</option>)}</select><select aria-label="Sort records" className="toolbar-select sort-select" value={sortBy} onChange={(event) => setSortBy(event.target.value)}><option value="name">Sort: Name</option><option value="email">Sort: Email</option><option value="course">Sort: Course</option></select><button className="sort-direction" title={sortDirection === "asc" ? "Ascending: click for descending" : "Descending: click for ascending"} onClick={() => setSortDirection((value) => value === "asc" ? "desc" : "asc")}>{sortDirection === "asc" ? "↑" : "↓"}</button></div>
                <div className="result-line">Showing <strong>{filteredStudents.length}</strong> of <strong>{students.length}</strong> student records</div>
                <StudentTable students={filteredStudents} loading={loading} onEdit={handleEdit} onDelete={handleDelete} />
                {!loading && filteredStudents.length === 0 && !error && <div className="empty-hint">{search || courseFilter !== "All courses" ? "Try changing your search or course filter." : "Your directory is ready. Add the first student using the form."}</div>}
              </section>
            </div>
          )}

          {activeView === "courses" && (
            <section className="content-card courses-page-card">
              <div className="section-heading"><div><span className="section-kicker">ACADEMIC CATALOGUE</span><h2>Courses & enrolments</h2><p>Select a course to view its student records.</p></div><button className="primary-button" onClick={startAddingStudent}>＋ Add student</button></div>
              <div className="course-card-grid">{courseCounts.map((item, index) => <article className="course-card" key={item.name}><div className={`course-card-icon mark-${index % 4}`}>{item.name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2)}</div><div className="course-card-main"><h3>{item.name}</h3><p>{item.count === 1 ? "1 student enrolled" : `${item.count} students enrolled`}</p></div><div className="course-card-bottom"><span>{students.length ? Math.round(item.count / students.length * 100) : 0}% of all students</span><button className="text-button" onClick={() => selectCourse(item.name)}>View students →</button></div></article>)}</div>
            </section>
          )}

          <footer className="page-footer"><span>CampusFlow · Student Management System</span><span><span className="footer-live-dot" /> Powered by React, Node.js & MongoDB Atlas</span></footer>
        </div>
      </main>
    </div>
  );
}

function StudentTable({ students, loading, onEdit, onDelete, compact = false }) {
  return (
    <div className="table-wrap">
      <table className="student-table">
        <thead><tr><th>STUDENT</th><th>EMAIL ADDRESS</th><th>COURSE</th><th className="action-column">ACTIONS</th></tr></thead>
        <tbody>
          {loading && <tr><td colSpan="4" className="table-message">Loading student records…</td></tr>}
          {!loading && students.map((student) => <tr key={student._id}>
            <td><div className="student-identity"><span className="student-avatar">{initials(student.name)}</span><span className="student-name">{student.name}</span></div></td>
            <td className="email-cell">{student.email}</td>
            <td><span className="course-tag">{student.course}</span></td>
            <td><div className="row-actions"><button className="row-edit" onClick={() => onEdit(student)} aria-label={`Edit ${student.name}`}>Edit</button><button className="row-delete" onClick={() => onDelete(student._id)} aria-label={`Delete ${student.name}`}>Delete</button></div></td>
          </tr>)}
          {!loading && students.length === 0 && <tr><td colSpan="4" className="table-message">No student records to display.</td></tr>}
        </tbody>
      </table>
      {compact && !loading && students.length > 0 && <div className="preview-footnote">Showing up to 5 records</div>}
    </div>
  );
}

export default App;
