import type { Task } from "../../types/Task";

interface Props {
  task: Task;
  onToggle: (id: number) => void;
  onDelete: (id: number) => void;
}

const TaskItem = ({ task, onToggle, onDelete }: Props) => {
  return (
    <div className="flex items-center gap-3 p-4 bg-white border rounded-lg">
      <input
        type="checkbox"
        checked={task.completed}
        onChange={() => task.id && onToggle(task.id)}
        className="w-5 h-5"
      />
      <span
        className={`flex-1 ${
          task.completed ? "line-through text-gray-400" : ""
        }`}
      >
        {task.title}
      </span>
      <button
        onClick={() => task.id && onDelete(task.id)}
        className="px-3 py-1 text-red-500 hover:bg-red-50 rounded"
      >
        削除
      </button>
    </div>
  );
};

export default TaskItem;
