import { useState, type FormEvent } from "react";
import type { Task } from "../../types/Task";
interface Props {
  onAdd: (task: Task) => void;
}

const TaskForm = ({ onAdd }: Props) => {
  const [title, setTitle] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onAdd({ title, completed: false });
    setTitle("");
  };

  return (
    <form onSubmit={handleSubmit} className="mb-6 flex gap-2">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="新しいタスク"
        className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <button
        type="submit"
        className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
      >
        追加
      </button>
    </form>
  );
};

export default TaskForm;
