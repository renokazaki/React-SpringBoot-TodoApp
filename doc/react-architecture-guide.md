# React アーキテクチャパターン完全ガイド

フロントエンドアーキテクチャの選択肢と実装例

---

## 目次

1. [基本構成](#1-基本構成)
2. [Container/Presentational パターン](#2-containerpresentational-パターン)
3. [Atomic Design](#3-atomic-design)
4. [Feature-based / Domain-driven 構成](#4-feature-based--domain-driven-構成)
5. [Clean Architecture for Frontend](#5-clean-architecture-for-frontend)
6. [Flux/Redux パターン](#6-fluxredux-パターン)
7. [比較と選択ガイド](#7-比較と選択ガイド)

---

## 1. 基本構成

### 概要

最もシンプルな構成。小規模プロジェクトや学習に最適。

### フォルダ構成

```
frontend/src/
├── components/
│   ├── TaskForm.tsx
│   ├── TaskItem.tsx
│   └── TaskList.tsx
├── types/
│   └── Task.ts
├── App.tsx
├── main.tsx
└── index.css
```

### 実装例

**types/Task.ts**

```typescript
export interface Task {
  id?: number;
  title: string;
  completed: boolean;
}
```

**components/TaskItem.tsx**

```typescript
import type { Task } from "../types/Task";

interface Props {
  task: Task;
  onToggle: (id: number) => void;
  onDelete: (id: number) => void;
}

export const TaskItem = ({ task, onToggle, onDelete }: Props) => {
  return (
    <div className="flex items-center gap-3 p-4 bg-white border rounded-lg">
      <input
        type="checkbox"
        checked={task.completed}
        onChange={() => task.id && onToggle(task.id)}
        className="w-5 h-5"
      />
      <span className={`flex-1 ${task.completed ? "line-through text-gray-400" : ""}`}>
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
```

**App.tsx**

```typescript
import { useState, useEffect } from "react";
import TaskForm from "./components/TaskForm";
import TaskList from "./components/TaskList";
import type { Task } from "./types/Task";

const API_URL = "http://localhost:8080/api/tasks";

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
```

### メリット・デメリット

**メリット:**
- 最もシンプル
- 学習コストが低い
- 小規模プロジェクトに最適

**デメリット:**
- ロジックとUIが混在
- テストしにくい
- 拡張性に限界

### 向いているプロジェクト

- プロトタイプ
- 学習目的
- 1-2画面の小規模アプリ

---

## 2. Container/Presentational パターン

### 概要

ロジック（Container）と見た目（Presentational）を分離。

### フォルダ構成

```
frontend/src/
├── components/
│   ├── presentational/          # 見た目のみ
│   │   ├── TaskForm.tsx
│   │   ├── TaskItem.tsx
│   │   └── TaskList.tsx
│   └── container/               # ロジック・状態管理
│       ├── TaskFormContainer.tsx
│       ├── TaskListContainer.tsx
│       └── TaskPageContainer.tsx
├── hooks/
│   ├── useTasks.ts
│   └── useTaskForm.ts
├── services/
│   └── taskService.ts
├── types/
│   └── Task.ts
└── App.tsx
```

### 実装例

**services/taskService.ts - API層**

```typescript
import type { Task } from "../types/Task";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080/api/tasks";

export const taskService = {
  getAll: async (): Promise<Task[]> => {
    const response = await fetch(API_URL);
    if (!response.ok) throw new Error("Failed to fetch tasks");
    return response.json();
  },

  create: async (task: Omit<Task, "id">): Promise<Task> => {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(task),
    });
    if (!response.ok) throw new Error("Failed to create task");
    return response.json();
  },

  update: async (id: number, task: Task): Promise<Task> => {
    const response = await fetch(`${API_URL}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(task),
    });
    if (!response.ok) throw new Error("Failed to update task");
    return response.json();
  },

  delete: async (id: number): Promise<void> => {
    const response = await fetch(`${API_URL}/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) throw new Error("Failed to delete task");
  },
};
```

**hooks/useTasks.ts - カスタムフック**

```typescript
import { useState, useEffect } from "react";
import { taskService } from "../services/taskService";
import type { Task } from "../types/Task";

export const useTasks = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await taskService.getAll();
      setTasks(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tasks");
    } finally {
      setLoading(false);
    }
  };

  const addTask = async (task: Omit<Task, "id">) => {
    try {
      const newTask = await taskService.create(task);
      setTasks([...tasks, newTask]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add task");
      throw err;
    }
  };

  const toggleTask = async (id: number) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;

    try {
      const updated = await taskService.update(id, {
        ...task,
        completed: !task.completed,
      });
      setTasks(tasks.map((t) => (t.id === id ? updated : t)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to toggle task");
    }
  };

  const deleteTask = async (id: number) => {
    try {
      await taskService.delete(id);
      setTasks(tasks.filter((t) => t.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete task");
    }
  };

  return {
    tasks,
    loading,
    error,
    addTask,
    toggleTask,
    deleteTask,
    reload: loadTasks,
  };
};
```

**components/presentational/TaskList.tsx - 見た目のみ**

```typescript
import { TaskItem } from "./TaskItem";
import type { Task } from "../../types/Task";

interface Props {
  tasks: Task[];
  onToggle: (id: number) => void;
  onDelete: (id: number) => void;
}

export const TaskList = ({ tasks, onToggle, onDelete }: Props) => {
  if (tasks.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        タスクがありません
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {tasks.map((task) => (
        <TaskItem
          key={task.id}
          task={task}
          onToggle={onToggle}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
};
```

**components/container/TaskPageContainer.tsx - ロジック担当**

```typescript
import { TaskForm } from "../presentational/TaskForm";
import { TaskList } from "../presentational/TaskList";
import { useTasks } from "../../hooks/useTasks";

export const TaskPageContainer = () => {
  const { tasks, loading, error, addTask, toggleTask, deleteTask } = useTasks();

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-xl">読み込み中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-xl text-red-500">エラー: {error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <h1 className="text-3xl font-bold mb-6 text-gray-800">タスク管理</h1>
        <TaskForm onAdd={addTask} />
        <TaskList tasks={tasks} onToggle={toggleTask} onDelete={deleteTask} />
      </div>
    </div>
  );
};
```

### メリット・デメリット

**メリット:**
- ロジックとUIが分離
- テストしやすい
- コンポーネントの再利用性が高い

**デメリット:**
- ファイル数が増える
- 学習コストが少し上がる

### 向いているプロジェクト

- 中規模プロジェクト
- Redux/Zustandなど状態管理ライブラリを使う場合
- テストを重視する場合

---

## 3. Atomic Design

### 概要

コンポーネントを5つの階層に分類。デザインシステム構築に最適。

### フォルダ構成

```
frontend/src/
├── components/
│   ├── atoms/                   # 最小単位
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Checkbox.tsx
│   │   └── Text.tsx
│   ├── molecules/               # 原子の組み合わせ
│   │   ├── TaskItem.tsx
│   │   └── FormField.tsx
│   ├── organisms/               # 分子の組み合わせ
│   │   ├── TaskList.tsx
│   │   └── TaskForm.tsx
│   ├── templates/               # レイアウト
│   │   └── TaskPageTemplate.tsx
│   └── pages/                   # 実際のページ
│       └── TaskPage.tsx
├── hooks/
│   └── useTasks.ts
└── services/
    └── taskService.ts
```

### 実装例

**components/atoms/Button.tsx**

```typescript
import React from "react";

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "danger" | "secondary";
  type?: "button" | "submit";
  disabled?: boolean;
}

export const Button = ({
  children,
  onClick,
  variant = "primary",
  type = "button",
  disabled = false,
}: ButtonProps) => {
  const baseClasses = "px-4 py-2 rounded-lg font-medium transition-colors";
  const variantClasses = {
    primary: "bg-blue-500 text-white hover:bg-blue-600 disabled:bg-blue-300",
    danger: "bg-red-500 text-white hover:bg-red-600 disabled:bg-red-300",
    secondary: "bg-gray-200 text-gray-800 hover:bg-gray-300 disabled:bg-gray-100",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${variantClasses[variant]}`}
    >
      {children}
    </button>
  );
};
```

**components/atoms/Input.tsx**

```typescript
interface InputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: "text" | "email" | "password";
}

export const Input = ({
  value,
  onChange,
  placeholder,
  type = "text",
}: InputProps) => {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
    />
  );
};
```

**components/atoms/Checkbox.tsx**

```typescript
interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
}

export const Checkbox = ({ checked, onChange, label }: CheckboxProps) => {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-5 h-5 text-blue-500 rounded"
      />
      {label && <span>{label}</span>}
    </label>
  );
};
```

**components/molecules/TaskItem.tsx**

```typescript
import { Checkbox } from "../atoms/Checkbox";
import { Button } from "../atoms/Button";
import type { Task } from "../../types/Task";

interface Props {
  task: Task;
  onToggle: (id: number) => void;
  onDelete: (id: number) => void;
}

export const TaskItem = ({ task, onToggle, onDelete }: Props) => {
  return (
    <div className="flex items-center gap-3 p-4 bg-white border rounded-lg shadow-sm">
      <Checkbox
        checked={task.completed}
        onChange={() => task.id && onToggle(task.id)}
      />
      <span
        className={`flex-1 ${
          task.completed ? "line-through text-gray-400" : "text-gray-800"
        }`}
      >
        {task.title}
      </span>
      <Button variant="danger" onClick={() => task.id && onDelete(task.id)}>
        削除
      </Button>
    </div>
  );
};
```

**components/organisms/TaskList.tsx**

```typescript
import { TaskItem } from "../molecules/TaskItem";
import type { Task } from "../../types/Task";

interface Props {
  tasks: Task[];
  onToggle: (id: number) => void;
  onDelete: (id: number) => void;
}

export const TaskList = ({ tasks, onToggle, onDelete }: Props) => {
  if (tasks.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p className="text-lg">タスクがありません</p>
        <p className="text-sm mt-2">上のフォームから追加してください</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {tasks.map((task) => (
        <TaskItem
          key={task.id}
          task={task}
          onToggle={onToggle}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
};
```

**components/templates/TaskPageTemplate.tsx**

```typescript
interface TaskPageTemplateProps {
  header: React.ReactNode;
  form: React.ReactNode;
  list: React.ReactNode;
}

export const TaskPageTemplate = ({
  header,
  form,
  list,
}: TaskPageTemplateProps) => {
  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="mb-8">{header}</div>
        <div className="mb-6">{form}</div>
        <div>{list}</div>
      </div>
    </div>
  );
};
```

**components/pages/TaskPage.tsx**

```typescript
import { TaskPageTemplate } from "../templates/TaskPageTemplate";
import { TaskForm } from "../organisms/TaskForm";
import { TaskList } from "../organisms/TaskList";
import { useTasks } from "../../hooks/useTasks";

export const TaskPage = () => {
  const { tasks, addTask, toggleTask, deleteTask } = useTasks();

  return (
    <TaskPageTemplate
      header={<h1 className="text-3xl font-bold text-gray-800">タスク管理</h1>}
      form={<TaskForm onAdd={addTask} />}
      list={<TaskList tasks={tasks} onToggle={toggleTask} onDelete={deleteTask} />}
    />
  );
};
```

### メリット・デメリット

**メリット:**
- コンポーネントの再利用性が非常に高い
- デザインシステム構築に最適
- Storybookと相性が良い

**デメリット:**
- 学習コストが高い
- 小規模プロジェクトには過剰
- どの階層に分類すべきか迷う

### 向いているプロジェクト

- デザインシステムを構築する場合
- 複数プロダクトでコンポーネントを共有
- 大規模プロジェクト

---

## 4. Feature-based / Domain-driven 構成

### 概要

機能ごとにファイルをまとめる。チーム開発に最適。

### フォルダ構成

```
frontend/src/
├── features/                    # 機能ごとに分割
│   ├── tasks/
│   │   ├── components/
│   │   │   ├── TaskForm.tsx
│   │   │   ├── TaskItem.tsx
│   │   │   └── TaskList.tsx
│   │   ├── hooks/
│   │   │   └── useTasks.ts
│   │   ├── services/
│   │   │   └── taskService.ts
│   │   ├── types/
│   │   │   └── Task.ts
│   │   ├── store/              # オプション
│   │   │   └── taskStore.ts
│   │   └── index.ts            # 公開API
│   └── auth/                   # 別の機能
│       ├── components/
│       ├── hooks/
│       └── index.ts
│
├── shared/                      # 共通コンポーネント
│   ├── components/
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   └── Loading.tsx
│   ├── hooks/
│   │   └── useApi.ts
│   └── utils/
│       └── fetcher.ts
│
└── pages/
    └── TaskPage.tsx
```

### 実装例

**features/tasks/services/taskService.ts**

```typescript
import type { Task } from "../types/Task";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080/api/tasks";

export const taskService = {
  getAll: async (): Promise<Task[]> => {
    const response = await fetch(API_URL);
    return response.json();
  },

  create: async (task: Omit<Task, "id">): Promise<Task> => {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(task),
    });
    return response.json();
  },

  // ... 他のメソッド
};
```

**features/tasks/hooks/useTasks.ts**

```typescript
import { useState, useEffect } from "react";
import { taskService } from "../services/taskService";
import type { Task } from "../types/Task";

export const useTasks = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  
  useEffect(() => {
    taskService.getAll().then(setTasks);
  }, []);

  const addTask = async (task: Omit<Task, "id">) => {
    const newTask = await taskService.create(task);
    setTasks([...tasks, newTask]);
  };

  // ... 他のメソッド

  return { tasks, addTask, /* ... */ };
};
```

**features/tasks/index.ts - 機能の公開API**

```typescript
// コンポーネント
export { TaskList } from "./components/TaskList";
export { TaskForm } from "./components/TaskForm";
export { TaskItem } from "./components/TaskItem";

// フック
export { useTasks } from "./hooks/useTasks";

// 型
export type { Task } from "./types/Task";

// サービス（必要に応じて）
export { taskService } from "./services/taskService";
```

**pages/TaskPage.tsx**

```typescript
import { TaskList, TaskForm, useTasks } from "@/features/tasks";

export const TaskPage = () => {
  const { tasks, addTask, toggleTask, deleteTask } = useTasks();

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <h1 className="text-3xl font-bold mb-6">タスク管理</h1>
        <TaskForm onAdd={addTask} />
        <TaskList tasks={tasks} onToggle={toggleTask} onDelete={deleteTask} />
      </div>
    </div>
  );
};
```

### メリット・デメリット

**メリット:**
- 機能ごとに独立して開発できる
- チーム開発しやすい
- 機能の追加・削除が容易

**デメリット:**
- 初期設定が少し複雑
- 機能間の依存関係管理が必要

### 向いているプロジェクト

- 中〜大規模プロジェクト
- チーム開発（3人以上）
- Next.js App Router

---

## 5. Clean Architecture for Frontend

### 概要

バックエンドのクリーンアーキテクチャをフロントエンドに適用。

### フォルダ構成

```
frontend/src/
├── domain/                      # ビジネスロジック
│   ├── entities/
│   │   └── Task.ts
│   └── usecases/
│       ├── CreateTask.ts
│       ├── GetAllTasks.ts
│       └── UpdateTask.ts
│
├── application/                 # アプリケーション層
│   ├── ports/
│   │   └── TaskRepository.ts   # インターフェース
│   └── services/
│       └── TaskService.ts
│
├── infrastructure/              # 外部との接続
│   ├── api/
│   │   └── TaskApiRepository.ts
│   └── http/
│       └── httpClient.ts
│
└── presentation/                # UI層
    ├── components/
    │   ├── TaskForm.tsx
    │   ├── TaskItem.tsx
    │   └── TaskList.tsx
    ├── pages/
    │   └── TaskPage.tsx
    └── hooks/
        └── useTaskViewModel.ts
```

### 実装例

**domain/entities/Task.ts**

```typescript
export class Task {
  constructor(
    public readonly id: number | undefined,
    public readonly title: string,
    public readonly completed: boolean
  ) {}

  complete(): Task {
    if (this.completed) {
      throw new Error("Task is already completed");
    }
    return new Task(this.id, this.title, true);
  }

  static create(title: string): Task {
    if (!title.trim()) {
      throw new Error("Title cannot be empty");
    }
    return new Task(undefined, title, false);
  }
}
```

**application/ports/TaskRepository.ts**

```typescript
import { Task } from "../../domain/entities/Task";

export interface TaskRepository {
  getAll(): Promise<Task[]>;
  create(task: Task): Promise<Task>;
  update(id: number, task: Task): Promise<Task>;
  delete(id: number): Promise<void>;
}
```

**infrastructure/api/TaskApiRepository.ts**

```typescript
import { Task } from "../../domain/entities/Task";
import { TaskRepository } from "../../application/ports/TaskRepository";

export class TaskApiRepository implements TaskRepository {
  constructor(private apiUrl: string) {}

  async getAll(): Promise<Task[]> {
    const response = await fetch(this.apiUrl);
    const data = await response.json();
    return data.map((d: any) => new Task(d.id, d.title, d.completed));
  }

  async create(task: Task): Promise<Task> {
    const response = await fetch(this.apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: task.title,
        completed: task.completed,
      }),
    });
    const data = await response.json();
    return new Task(data.id, data.title, data.completed);
  }

  // ... 他のメソッド
}
```

**presentation/hooks/useTaskViewModel.ts**

```typescript
import { useState, useEffect } from "react";
import { Task } from "../../domain/entities/Task";
import { TaskRepository } from "../../application/ports/TaskRepository";

export const useTaskViewModel = (repository: TaskRepository) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const data = await repository.getAll();
      setTasks(data);
    } finally {
      setLoading(false);
    }
  };

  const createTask = async (title: string) => {
    const task = Task.create(title);
    const created = await repository.create(task);
    setTasks([...tasks, created]);
  };

  return { tasks, loading, createTask };
};
```

**presentation/pages/TaskPage.tsx**

```typescript
import { TaskApiRepository } from "../../infrastructure/api/TaskApiRepository";
import { useTaskViewModel } from "../hooks/useTaskViewModel";
import { TaskForm } from "../components/TaskForm";
import { TaskList } from "../components/TaskList";

const repository = new TaskApiRepository(
  import.meta.env.VITE_API_URL || "http://localhost:8080/api/tasks"
);

export const TaskPage = () => {
  const { tasks, loading, createTask } = useTaskViewModel(repository);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <TaskForm onAdd={createTask} />
      <TaskList tasks={tasks} />
    </div>
  );
};
```

### メリット・デメリット

**メリット:**
- テストが非常に容易（依存注入）
- ビジネスロジックがフレームワークに依存しない
- APIの変更に強い

**デメリット:**
- 学習コストが非常に高い
- コード量が多い
- 小規模プロジェクトには過剰

### 向いているプロジェクト

- 大規模プロジェクト
- 複雑なビジネスロジック
- 長期運用（5年以上）

---

## 6. Flux/Redux パターン

### 概要

単方向データフロー。グローバルな状態管理。

### フォルダ構成

```
frontend/src/
├── store/
│   ├── tasks/
│   │   ├── taskSlice.ts        # Redux Toolkit
│   │   ├── taskThunks.ts       # 非同期処理
│   │   └── taskSelectors.ts    # セレクター
│   └── index.ts
├── components/
│   ├── TaskForm.tsx
│   ├── TaskItem.tsx
│   └── TaskList.tsx
├── pages/
│   └── TaskPage.tsx
└── services/
    └── taskApi.ts
```

### 実装例（Redux Toolkit）

**store/tasks/taskSlice.ts**

```typescript
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { Task } from "../../types/Task";

interface TaskState {
  tasks: Task[];
  loading: boolean;
  error: string | null;
}

const initialState: TaskState = {
  tasks: [],
  loading: false,
  error: null,
};

const taskSlice = createSlice({
  name: "tasks",
  initialState,
  reducers: {
    setTasks(state, action: PayloadAction<Task[]>) {
      state.tasks = action.payload;
    },
    addTask(state, action: PayloadAction<Task>) {
      state.tasks.push(action.payload);
    },
    updateTask(state, action: PayloadAction<Task>) {
      const index = state.tasks.findIndex((t) => t.id === action.payload.id);
      if (index !== -1) {
        state.tasks[index] = action.payload;
      }
    },
    deleteTask(state, action: PayloadAction<number>) {
      state.tasks = state.tasks.filter((t) => t.id !== action.payload);
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
    },
  },
});

export const { setTasks, addTask, updateTask, deleteTask, setLoading, setError } =
  taskSlice.actions;
export default taskSlice.reducer;
```

**store/tasks/taskThunks.ts**

```typescript
import { setTasks, addTask, setLoading, setError } from "./taskSlice";
import { taskApi } from "../../services/taskApi";
import type { AppDispatch } from "../index";

export const fetchTasks = () => async (dispatch: AppDispatch) => {
  dispatch(setLoading(true));
  dispatch(setError(null));
  try {
    const tasks = await taskApi.getAll();
    dispatch(setTasks(tasks));
  } catch (error) {
    dispatch(setError("Failed to fetch tasks"));
  } finally {
    dispatch(setLoading(false));
  }
};

export const createTask =
  (title: string) => async (dispatch: AppDispatch) => {
    try {
      const task = await taskApi.create({ title, completed: false });
      dispatch(addTask(task));
    } catch (error) {
      dispatch(setError("Failed to create task"));
    }
  };
```

**components/TaskList.tsx**

```typescript
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchTasks } from "../store/tasks/taskThunks";
import { TaskItem } from "./TaskItem";
import type { RootState, AppDispatch } from "../store";

export const TaskList = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { tasks, loading, error } = useSelector((state: RootState) => state.tasks);

  useEffect(() => {
    dispatch(fetchTasks());
  }, [dispatch]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="space-y-2">
      {tasks.map((task) => (
        <TaskItem key={task.id} task={task} />
      ))}
    </div>
  );
};
```

### メリット・デメリット

**メリット:**
- グローバルな状態管理
- タイムトラベルデバッグ
- 予測可能な状態変更

**デメリット:**
- ボイラープレートが多い
- 学習コストが高い
- 小規模には過剰

### 向いているプロジェクト

- 複雑な状態管理が必要
- グローバルな状態が多い
- 大規模プロジェクト

---

## 7. 比較と選択ガイド

### 比較表

| パターン | 小規模 | 中規模 | 大規模 | チーム開発 | テスト | 学習コスト |
|---------|-------|-------|-------|-----------|--------|-----------|
| **基本構成** | ◎ | △ | × | △ | △ | 低 |
| **Container/Presentational** | ○ | ◎ | ○ | ◎ | ◎ | 中 |
| **Atomic Design** | × | ○ | ◎ | ◎ | ◎ | 高 |
| **Feature-based** | △ | ◎ | ◎ | ◎ | ◎ | 中 |
| **Clean Architecture** | × | △ | ◎ | ◎ | ◎ | 高 |
| **Flux/Redux** | × | ○ | ◎ | ◎ | ◎ | 高 |

### 技術スタック別おすすめ

| 技術構成 | 推奨アーキテクチャ |
|---------|------------------|
| React + Vite（小規模） | 基本構成 |
| React + Vite（中規模） | Feature-based |
| React + Vite（大規模） | Feature-based + Container/Presentational |
| Next.js App Router | Feature-based |
| Next.js Pages Router | Container/Presentational + Redux |
| デザインシステム構築 | Atomic Design |

### プロジェクト規模別推奨

**小規模（1-3人、1-5画面）:**
- 基本構成
- シンプルで十分

**中規模（3-10人、5-20画面）:**
- Feature-based構成
- チーム開発しやすい

**大規模（10人以上、20画面以上）:**
- Feature-based + Atomic Design
- または Clean Architecture

### 段階的移行パス

```
Phase 1: 基本構成
    ↓ hooks/services分離
Phase 2: Container/Presentational
    ↓ 機能ごとにまとめる
Phase 3: Feature-based
    ↓ コンポーネント階層化
Phase 4: Feature-based + Atomic Design
```

---

## まとめ

### 今すぐ始めるなら
- **基本構成** - 学習目的、プロトタイプ

### 本番環境なら
- **Feature-based構成** - チーム開発、拡張性

### エンタープライズなら
- **Feature-based + Atomic Design** - 大規模、デザインシステム

### 重要な原則
1. シンプルから始める
2. 必要に応じて段階的に移行
3. 過剰設計を避ける
4. チームの理解度に合わせる

アーキテクチャは手段であり、目的ではない。
プロジェクトに合った選択をすることが最も重要。
