# Spring Boot + React タスク管理アプリ デプロイガイド

完全な手順書：monorepo 構成でフロントエンドとバックエンドを開発し、デプロイするまで

## 目次

1. [プロジェクト構成](#1-プロジェクト構成)
2. [Backend（Spring Boot）のセットアップ](#2-backendspring-bootのセットアップ)
3. [Frontend（React + TypeScript）のセットアップ](#3-frontendreact--typescriptのセットアップ)
4. [データベース（Supabase）のセットアップ](#4-データベースsupabaseのセットアップ)
5. [ローカルでの動作確認](#5-ローカルでの動作確認)
6. [デプロイ準備](#6-デプロイ準備)
7. [Backend デプロイ（Render）](#7-backend-デプロイrender)
8. [Frontend デプロイ（Vercel）](#8-frontend-デプロイvercel)
9. [動作確認](#9-動作確認)

---

## 1. プロジェクト構成

```
project-root/
├── backend/                    # Spring Boot アプリ
│   ├── src/
│   │   └── main/
│   │       ├── java/com/example/demo/
│   │       │   ├── DemoApplication.java
│   │       │   ├── config/
│   │       │   │   └── SecurityConfig.java
│   │       │   ├── controller/
│   │       │   │   └── TaskController.java
│   │       │   ├── model/
│   │       │   │   └── Task.java
│   │       │   └── repository/
│   │       │       └── TaskRepository.java
│   │       └── resources/
│   │           └── application.properties

│   ├── build.gradle
│   ├── settings.gradle
│   └── Dockerfile
│
├── frontend/                   # React アプリ
│   ├── src/
│   │   ├── components/
│   │   │   ├── TaskForm.tsx
│   │   │   ├── TaskItem.tsx
│   │   │   └── TaskList.tsx
│   │   ├── types/
│   │   │   └── Task.ts
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css
│   ├── .env
│   ├── package.json
│   └── vite.config.ts
│
├── .gitignore
└── README.md
```

---

## 2. Backend（Spring Boot）のセットアップ

### 2.1 Spring Initializr で初期プロジェクト作成

https://start.spring.io/ で以下を選択：

- Project: Gradle - Groovy
- Language: Java
- Spring Boot: 3.5.6
- Java: 17
- Dependencies: Spring Web, Spring Data JPA, Spring Security, PostgreSQL Driver, Lombok

### 2.2 build.gradle

```gradle
plugins {
    id 'java'
    id 'org.springframework.boot' version '3.5.6'
    id 'io.spring.dependency-management' version '1.1.7'
}

group = 'com.example'
version = '0.0.1-SNAPSHOT'

java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(17)
    }
}

repositories {
    mavenCentral()
}

dependencies {
    implementation 'org.springframework.boot:spring-boot-starter-data-jpa'
    implementation 'org.springframework.boot:spring-boot-starter-security'
    implementation 'org.springframework.boot:spring-boot-starter-web'
    compileOnly 'org.projectlombok:lombok'
    developmentOnly 'org.springframework.boot:spring-boot-devtools'
    runtimeOnly 'org.postgresql:postgresql'
    annotationProcessor 'org.projectlombok:lombok'
    testImplementation 'org.springframework.boot:spring-boot-starter-test'
    testImplementation 'org.springframework.security:spring-security-test'
    testRuntimeOnly 'org.junit.platform:junit-platform-launcher'
}

tasks.named('test') {
    useJUnitPlatform()
}
```

### 2.3 Java ファイル

**DemoApplication.java**

```java
package com.example.demo;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class DemoApplication {
    public static void main(String[] args) {
        SpringApplication.run(DemoApplication.class, args);
    }
}
```

**SecurityConfig.java**

```java
package com.example.demo.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
public class SecurityConfig {
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http.csrf(csrf -> csrf.disable())
            .authorizeHttpRequests(auth -> auth.anyRequest().permitAll());
        return http.build();
    }
}
```

**Task.java**

```java
package com.example.demo.model;

import jakarta.persistence.*;

@Entity
public class Task {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String title;
    private boolean completed;

    public Task() {}

    public Task(String title, boolean completed) {
        this.title = title;
        this.completed = completed;
    }

    // Getters & Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public boolean isCompleted() { return completed; }
    public void setCompleted(boolean completed) { this.completed = completed; }
}
```

**TaskRepository.java**

```java
package com.example.demo.repository;

import com.example.demo.model.Task;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TaskRepository extends JpaRepository<Task, Long> {
}
```

**TaskController.java**

```java
package com.example.demo.controller;

import com.example.demo.model.Task;
import com.example.demo.repository.TaskRepository;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@CrossOrigin(origins = "*")
@RequestMapping("/api/tasks")
public class TaskController {
    private final TaskRepository repository;

    public TaskController(TaskRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    public List<Task> getAllTasks() {
        return repository.findAll();
    }

    @PostMapping
    public Task createTask(@RequestBody Task task) {
        return repository.save(task);
    }

    @PutMapping("/{id}")
    public Task updateTask(@PathVariable Long id, @RequestBody Task task) {
        task.setId(id);
        return repository.save(task);
    }

    @DeleteMapping("/{id}")
    public void deleteTask(@PathVariable Long id) {
        repository.deleteById(id);
    }
}
```

### 2.4 Dockerfile

**backend/Dockerfile**

```dockerfile
FROM eclipse-temurin:17-jdk-alpine
WORKDIR /app
COPY gradlew .
COPY gradle gradle
COPY build.gradle settings.gradle ./
COPY src src
RUN chmod +x ./gradlew
RUN ./gradlew build -x test
EXPOSE 8080
CMD ["java", "-jar", "build/libs/demo-0.0.1-SNAPSHOT.jar"]
```

---

## 3. Frontend（React + TypeScript）のセットアップ

### 3.1 プロジェクト作成

```bash
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install
```

### 3.3 TypeScript ファイル

**types/Task.ts**

```typescript
export interface Task {
  id?: number;
  title: string;
  completed: boolean;
}
```

**components/TaskForm.tsx**

```typescript
import { useState, type FormEvent } from "react";
import type { Task } from "../types/Task";

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
```

**components/TaskItem.tsx**

```typescript
import type { Task } from "../types/Task";

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
```

**components/TaskList.tsx**

```typescript
import TaskItem from "./TaskItem";
import type { Task } from "../types/Task";

interface Props {
  tasks: Task[];
  onToggle: (id: number) => void;
  onDelete: (id: number) => void;
}

const TaskList = ({ tasks, onToggle, onDelete }: Props) => {
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

export default TaskList;
```

**App.tsx**

```typescript
import { useState, useEffect } from "react";
import TaskForm from "./components/TaskForm";
import TaskList from "./components/TaskList";
import type { Task } from "./types/Task";

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
```

---

## 4. データベース（Supabase）のセットアップ

### 4.1 Supabase でプロジェクト作成

1. https://supabase.com でサインアップ
2. "New Project" をクリック
3. プロジェクト名、パスワードを設定
4. リージョン: Northeast Asia (Tokyo)

### 4.2 接続情報を取得

1. Project Settings → Database
2. Connection string → JDBC タブ
3. 多分 2 個目の方の URL を確認
4. URL をコピー（例: `jdbc:postgresql://db.xxx.supabase.co:5432/postgres`）

### 4.3 テーブル作成（自動）

Spring Boot が初回起動時に自動的に`task`テーブルを作成される。

確認方法: Supabase → Table Editor

---

## 5. ローカルでの動作確認

### 5.1 Backend 設定

**backend/src/main/resources/application.properties**

```properties
spring.datasource.url=jdbc:postgresql://db.xxx.supabase.co:5432/postgres
spring.jpa.hibernate.ddl-auto=update
spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.PostgreSQLDialect
```

### 5.2 Backend 起動

```bash
cd backend
./gradlew bootRun
```

`http://localhost:8080/api/tasks` にアクセスして `[]` が返ってくれば OK

### 5.3 Frontend 設定

**frontend/.env.development**

```
VITE_API_URL=http://localhost:8080/api/tasks
```

### 5.4 Frontend 起動

```bash
cd frontend
npm run dev
```

`http://localhost:5173` にアクセスしてタスク追加できるか確認

---

## 6. デプロイ準備

### 6.1 .gitignore の設定

**プロジェクトルートの.gitignore**

```
# Backend
backend/src/main/resources/application.properties
backend/build/
backend/.gradle/

# Frontend
frontend/node_modules/
frontend/dist/
frontend/.env.development
frontend/.env.production
```

### 6.3 本番用環境変数ファイル

**frontend/.env**

```
VITE_API_URL=https://your-backend.onrender.com/api/tasks
```

### 6.4 GitHub にプッシュ

```bash
git add .
git commit -m "Initial commit"
git push origin main
```

---

## 7. Backend デプロイ（Render）

### 7.1 Render でサービス作成

1. https://render.com でサインアップ
2. New → Web Service
3. GitHub リポジトリを接続

### 7.2 設定

**Environment:** Docker

**Root Directory:**

```
backend
```

**Dockerfile Path:**
（空欄）

### 7.3 環境変数を設定

Environment タブで以下を追加：

```
DATABASE_URL=jdbc:postgresql://db.xxx.supabase.co:5432/postgres
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=your-password
```

### 7.4 デプロイ

"Create Web Service" をクリック → 5-10 分待つ

完成 URL: `https://your-app.onrender.com`

### 7.5 動作確認

`https://your-app.onrender.com/api/tasks` にアクセスして `[]` が返ってくれば OK

---

## 8. Frontend デプロイ（Vercel）

### 8.1 Vercel でプロジェクト作成

1. https://vercel.com でサインアップ
2. "Add New..." → "Project"
3. GitHub リポジトリを接続

### 8.2 設定

**Framework Preset:** Vite

**Root Directory:** `frontend`

**Environment Variables:**

```
VITE_API_URL=https://your-backend.onrender.com/api/tasks
```

### 8.3 デプロイ

"Deploy" をクリック → 1-2 分待つ

完成 URL: `https://your-app.vercel.app`

---

## 9. 動作確認

1. Vercel のフロントエンドにアクセス
2. タスクを追加
3. Supabase → Table Editor で `task` テーブルにデータが入っているか確認

---

## トラブルシューティング

### Backend 起動時のエラー

**UnknownHostException:**

- Supabase の URL が間違っている
- `jdbc:` で始まっているか確認

**Port 8080 already in use:**

```bash
# Windowsの場合
netstat -ano | findstr :8080
taskkill /PID <PID> /F
```

### Frontend CORS エラー

TaskController.java の`@CrossOrigin`を確認：

```java
@CrossOrigin(origins = {"http://localhost:5173", "https://your-app.vercel.app"})
```

### Render デプロイエラー

- Dockerfile があることを確認
- Root Directory が`backend`になっているか確認
- 環境変数が正しく設定されているか確認

---

## まとめ

これで完全なフルスタックアプリケーションが完成しました！

**構成:**

- Frontend: React + TypeScript + Tailwind CSS（Vercel）
- Backend: Spring Boot + JPA（Render）
- Database: PostgreSQL（Supabase）

**次のステップ:**

- 認証機能の追加（Spring Security）
- タスクの期限・優先度機能
- ユーザーごとのタスク管理
- CI/CD パイプラインの構築
