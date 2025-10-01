import { useState, useEffect } from "react";
import TaskForm from "./components/TaskForm";
import TaskList from "./components/TaskList";
import type { Task } from "../types/Task";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:8080/api/tasks";

function App() {
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    fetch(API_URL)
      .then((res) => res.json())
      .then((data) => setTasks(data));
  }, []);

  const addTask = (task: Task) => {
    fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(task),
    })
      .then((res) => res.json())
      .then((newTask) => setTasks([...tasks, newTask]));
  };

  const toggleTask = (id: number) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;

    fetch(`${API_URL}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...task, completed: !task.completed }),
    })
      .then((res) => res.json())
      .then((updatedTask) =>
        setTasks(tasks.map((t) => (t.id === id ? updatedTask : t)))
      );
  };

  const deleteTask = (id: number) => {
    fetch(`${API_URL}/${id}`, { method: "DELETE" }).then(() =>
      setTasks(tasks.filter((t) => t.id !== id))
    );
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <h1 className="text-3xl font-bold mb-6 text-gray-800">タスク管理</h1>
        <TaskForm onAdd={addTask} />
        <TaskList tasks={tasks} onToggle={toggleTask} onDelete={deleteTask} />
      </div>
    </div>
  );
}

export default App;
