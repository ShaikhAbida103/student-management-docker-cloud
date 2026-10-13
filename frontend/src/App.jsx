
import { useEffect, useState } from "react";
import "./App.css";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000";

const API_URL = `${API_BASE_URL.replace(/\/$/, "")}/api/students`;

function App() {
  const [students, setStudents] = useState([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [course, setCourse] = useState("BCA");
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // READ: Load students from MongoDB through the backend
  async function loadStudents() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(API_URL);

      if (!response.ok) {
        throw new Error("Could not load student records.");
      }

      const data = await response.json();
      setStudents(data);
    } catch (err) {
      setError(
        "Could not connect to the backend. Check that the backend and MongoDB are running."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStudents();
  }, []);

  function resetForm() {
    setName("");
    setEmail("");
    setCourse("BCA");
    setEditingId(null);
  }

  // CREATE or UPDATE a student
  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        editingId ? `${API_URL}/${editingId}` : API_URL,
        {
          method: editingId ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ name, email, course }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not save student.");
      }

      setMessage(
        editingId
          ? "Student updated successfully!"
          : "Student added successfully!"
      );

      resetForm();
      await loadStudents();
    } catch (err) {
      setError(err.message || "Could not save student.");
    }
  }

  // Load the selected student into the form
  function handleEdit(student) {
    setEditingId(student._id);
    setName(student.name);
    setEmail(student.email);
    setCourse(student.course);
    setMessage("");
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // DELETE a student from MongoDB
  async function handleDelete(id) {
    if (!window.confirm("Are you sure you want to delete this student?")) {
      return;
    }

    setError("");
    setMessage("");

    try {
      const response = await fetch(`${API_URL}/${id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not delete student.");
      }

      setMessage("Student deleted successfully!");
      await loadStudents();
    } catch (err) {
      setError(err.message || "Could not delete student.");
    }
  }

  const filteredStudents = students.filter((student) =>
    `${student.name} ${student.email} ${student.course}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <div className="app">
      <header className="header">
        <div>
          <h1>Student Management System</h1>
          <p>Manage student records from one place.</p>
        </div>
        <span className="status">Database-backed application</span>
      </header>

      <main className="container">
        <section className="stats">
          <div className="stat-card">
            <span>Total Students</span>
            <strong>{students.length}</strong>
          </div>

          <div className="stat-card">
            <span>Courses Represented</span>
            <strong>
              {new Set(students.map((student) => student.course)).size}
            </strong>
          </div>
        </section>

        <section className="panel">
          <h2>{editingId ? "Edit Student" : "Add New Student"}</h2>

          <form onSubmit={handleSubmit} className="student-form">
            <input
              type="text"
              placeholder="Student name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />

            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />

            <select
              value={course}
              onChange={(event) => setCourse(event.target.value)}
            >
              <option value="BCA">BCA</option>
              <option value="BSc IT">BSc IT</option>
              <option value="BSc Computer Science">BSc Computer Science</option>
              <option value="MCA">MCA</option>
            </select>

            <button type="submit">
              {editingId ? "Save Changes" : "+ Add Student"}
            </button>

            {editingId && (
              <button type="button" onClick={resetForm}>
                Cancel Editing
              </button>
            )}
          </form>

          {message && <p role="status">{message}</p>}
          {error && <p role="alert">{error}</p>}
        </section>

        <section className="panel">
          <div className="table-heading">
            <h2>Student Records</h2>

            <input
              className="search"
              type="search"
              placeholder="Search students..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Course</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {loading && (
                  <tr>
                    <td colSpan="4">Loading student records...</td>
                  </tr>
                )}

                {!loading &&
                  filteredStudents.map((student) => (
                    <tr key={student._id}>
                      <td>{student.name}</td>
                      <td>{student.email}</td>
                      <td>{student.course}</td>
                      <td>
                        <div className="action-buttons">
                          <button
                            type="button"
                            className="edit-button"
                            onClick={() => handleEdit(student)}
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            className="delete-button"
                            onClick={() => handleDelete(student._id)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                {!loading && filteredStudents.length === 0 && (
                  <tr>
                    <td colSpan="4" className="empty">
                      {error
                        ? "Student records could not be loaded."
                        : "No students found. Add your first student above."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
