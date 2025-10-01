# Spring Boot アーキテクチャパターン完全ガイド

バックエンドアーキテクチャの選択肢と実装例

---

## 目次

1. [基本：レイヤードアーキテクチャ](#1-レイヤードアーキテクチャ)
2. [ヘキサゴナルアーキテクチャ](#2-ヘキサゴナルアーキテクチャ)
3. [クリーンアーキテクチャ](#3-クリーンアーキテクチャ)
4. [オニオンアーキテクチャ](#4-オニオンアーキテクチャ)
5. [CQRS](#5-cqrs)
6. [比較と選択ガイド](#6-比較と選択ガイド)

---

## 1. レイヤードアーキテクチャ

### 概要

最もシンプルで一般的なアーキテクチャ。層を明確に分離。

### フォルダ構成

```
backend/src/main/java/com/example/demo/
├── controller/
│   └── TaskController.java
├── service/
│   └── TaskService.java
├── repository/
│   └── TaskRepository.java
├── model/
│   └── Task.java
└── config/
    └── SecurityConfig.java
```

### 実装例

**Task.java - エンティティ**

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

**TaskRepository.java - データアクセス層**

```java
package com.example.demo.repository;

import com.example.demo.model.Task;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TaskRepository extends JpaRepository<Task, Long> {
    // Spring Data JPAが自動実装
    // findAll(), save(), deleteById() などが使える
}
```

**TaskService.java - ビジネスロジック層**

```java
package com.example.demo.service;

import com.example.demo.model.Task;
import com.example.demo.repository.TaskRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional
public class TaskService {
    private final TaskRepository repository;

    public TaskService(TaskRepository repository) {
        this.repository = repository;
    }

    public List<Task> getAllTasks() {
        return repository.findAll();
    }

    public Task createTask(Task task) {
        // ビジネスルール
        if (task.getTitle() == null || task.getTitle().trim().isEmpty()) {
            throw new IllegalArgumentException("Title cannot be empty");
        }
        return repository.save(task);
    }

    public Task updateTask(Long id, Task task) {
        return repository.findById(id)
            .map(existing -> {
                existing.setTitle(task.getTitle());
                existing.setCompleted(task.isCompleted());
                return repository.save(existing);
            })
            .orElseThrow(() -> new RuntimeException("Task not found: " + id));
    }

    public void deleteTask(Long id) {
        repository.deleteById(id);
    }
}
```

**TaskController.java - プレゼンテーション層**

```java
package com.example.demo.controller;

import com.example.demo.model.Task;
import com.example.demo.service.TaskService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@CrossOrigin(origins = "*")
@RequestMapping("/api/tasks")
public class TaskController {
    private final TaskService service;

    public TaskController(TaskService service) {
        this.service = service;
    }

    @GetMapping
    public List<Task> getAllTasks() {
        return service.getAllTasks();
    }

    @PostMapping
    public Task createTask(@RequestBody Task task) {
        return service.createTask(task);
    }

    @PutMapping("/{id}")
    public Task updateTask(@PathVariable Long id, @RequestBody Task task) {
        return service.updateTask(id, task);
    }

    @DeleteMapping("/{id}")
    public void deleteTask(@PathVariable Long id) {
        service.deleteTask(id);
    }
}
```

### メリット・デメリット

**メリット:**
- シンプルで理解しやすい
- Spring Bootの標準的な構成
- 小〜中規模プロジェクトに最適

**デメリット:**
- 層間の依存が強い
- ビジネスロジックがフレームワークに依存

### 向いているプロジェクト

- 小〜中規模のCRUDアプリケーション
- Spring Boot学習
- プロトタイプ開発

---

## 2. ヘキサゴナルアーキテクチャ

### 概要

ポート&アダプターパターン。ビジネスロジックを中心に、外部との接続を抽象化。

### フォルダ構成

```
backend/src/main/java/com/example/demo/
├── domain/                          # ビジネスロジックの中核
│   ├── model/
│   │   └── Task.java
│   ├── port/
│   │   ├── in/                     # 入力ポート
│   │   │   ├── CreateTaskUseCase.java
│   │   │   ├── GetAllTasksUseCase.java
│   │   │   ├── UpdateTaskUseCase.java
│   │   │   └── DeleteTaskUseCase.java
│   │   └── out/                    # 出力ポート
│   │       └── TaskPort.java
│   └── service/
│       └── TaskService.java
│
└── adapter/                         # 外部との接続
    ├── in/
    │   └── web/
    │       └── TaskController.java
    └── out/
        └── persistence/
            ├── TaskEntity.java
            ├── TaskJpaRepository.java
            └── TaskPersistenceAdapter.java
```

### 実装例

**domain/model/Task.java - ドメインモデル**

```java
package com.example.demo.domain.model;

public class Task {
    private Long id;
    private String title;
    private boolean completed;

    public Task(Long id, String title, boolean completed) {
        this.id = id;
        this.title = title;
        this.completed = completed;
    }

    // ビジネスルール
    public void complete() {
        if (this.completed) {
            throw new IllegalStateException("Task is already completed");
        }
        this.completed = true;
    }

    // Getters
    public Long getId() { return id; }
    public String getTitle() { return title; }
    public boolean isCompleted() { return completed; }
}
```

**domain/port/in/CreateTaskUseCase.java - 入力ポート**

```java
package com.example.demo.domain.port.in;

import com.example.demo.domain.model.Task;

public interface CreateTaskUseCase {
    Task createTask(String title);
}
```

**domain/port/out/TaskPort.java - 出力ポート**

```java
package com.example.demo.domain.port.out;

import com.example.demo.domain.model.Task;
import java.util.List;
import java.util.Optional;

public interface TaskPort {
    Task save(Task task);
    List<Task> findAll();
    Optional<Task> findById(Long id);
    void deleteById(Long id);
}
```

**domain/service/TaskService.java - ビジネスロジック**

```java
package com.example.demo.domain.service;

import com.example.demo.domain.model.Task;
import com.example.demo.domain.port.in.*;
import com.example.demo.domain.port.out.TaskPort;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class TaskService implements 
    CreateTaskUseCase, 
    GetAllTasksUseCase, 
    UpdateTaskUseCase, 
    DeleteTaskUseCase {
    
    private final TaskPort taskPort;

    public TaskService(TaskPort taskPort) {
        this.taskPort = taskPort;
    }

    @Override
    public Task createTask(String title) {
        if (title == null || title.trim().isEmpty()) {
            throw new IllegalArgumentException("Title cannot be empty");
        }
        Task task = new Task(null, title, false);
        return taskPort.save(task);
    }

    @Override
    public List<Task> getAllTasks() {
        return taskPort.findAll();
    }

    @Override
    public Task updateTask(Long id, String title, boolean completed) {
        Task task = taskPort.findById(id)
            .orElseThrow(() -> new RuntimeException("Task not found"));
        Task updated = new Task(id, title, completed);
        return taskPort.save(updated);
    }

    @Override
    public void deleteTask(Long id) {
        taskPort.deleteById(id);
    }
}
```

**adapter/out/persistence/TaskEntity.java - JPA用エンティティ**

```java
package com.example.demo.adapter.out.persistence;

import jakarta.persistence.*;

@Entity
@Table(name = "task")
public class TaskEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String title;
    private boolean completed;

    // Constructors, Getters, Setters
}
```

**adapter/out/persistence/TaskPersistenceAdapter.java - ポートの実装**

```java
package com.example.demo.adapter.out.persistence;

import com.example.demo.domain.model.Task;
import com.example.demo.domain.port.out.TaskPort;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Component
public class TaskPersistenceAdapter implements TaskPort {
    private final TaskJpaRepository repository;

    public TaskPersistenceAdapter(TaskJpaRepository repository) {
        this.repository = repository;
    }

    @Override
    public Task save(Task task) {
        TaskEntity entity = toEntity(task);
        TaskEntity saved = repository.save(entity);
        return toDomain(saved);
    }

    @Override
    public List<Task> findAll() {
        return repository.findAll().stream()
            .map(this::toDomain)
            .collect(Collectors.toList());
    }

    @Override
    public Optional<Task> findById(Long id) {
        return repository.findById(id)
            .map(this::toDomain);
    }

    @Override
    public void deleteById(Long id) {
        repository.deleteById(id);
    }

    // マッピング
    private TaskEntity toEntity(Task task) {
        TaskEntity entity = new TaskEntity();
        entity.setId(task.getId());
        entity.setTitle(task.getTitle());
        entity.setCompleted(task.isCompleted());
        return entity;
    }

    private Task toDomain(TaskEntity entity) {
        return new Task(
            entity.getId(),
            entity.getTitle(),
            entity.isCompleted()
        );
    }
}
```

**adapter/in/web/TaskController.java**

```java
package com.example.demo.adapter.in.web;

import com.example.demo.domain.model.Task;
import com.example.demo.domain.port.in.*;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/tasks")
public class TaskController {
    private final CreateTaskUseCase createTaskUseCase;
    private final GetAllTasksUseCase getAllTasksUseCase;
    private final UpdateTaskUseCase updateTaskUseCase;
    private final DeleteTaskUseCase deleteTaskUseCase;

    public TaskController(
        CreateTaskUseCase createTaskUseCase,
        GetAllTasksUseCase getAllTasksUseCase,
        UpdateTaskUseCase updateTaskUseCase,
        DeleteTaskUseCase deleteTaskUseCase
    ) {
        this.createTaskUseCase = createTaskUseCase;
        this.getAllTasksUseCase = getAllTasksUseCase;
        this.updateTaskUseCase = updateTaskUseCase;
        this.deleteTaskUseCase = deleteTaskUseCase;
    }

    @GetMapping
    public List<Task> getAll() {
        return getAllTasksUseCase.getAllTasks();
    }

    @PostMapping
    public Task create(@RequestBody CreateTaskRequest request) {
        return createTaskUseCase.createTask(request.getTitle());
    }

    @PutMapping("/{id}")
    public Task update(@PathVariable Long id, @RequestBody UpdateTaskRequest request) {
        return updateTaskUseCase.updateTask(id, request.getTitle(), request.isCompleted());
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        deleteTaskUseCase.deleteTask(id);
    }
}
```

### メリット・デメリット

**メリット:**
- ビジネスロジックが外部技術から独立
- テストしやすい（モックが容易）
- データベースやフレームワークを変更しやすい

**デメリット:**
- コード量が増える
- 学習コストが高い

### 向いているプロジェクト

- 中〜大規模プロジェクト
- マイクロサービス
- 長期運用が予定されているシステム

---

## 3. クリーンアーキテクチャ

### 概要

依存関係を内側に向ける。最も内側にビジネスルール。

### フォルダ構成

```
backend/src/main/java/com/example/demo/
├── domain/                          # 最も内側
│   ├── entity/
│   │   └── Task.java
│   └── exception/
│       └── TaskNotFoundException.java
│
├── usecase/                         # アプリケーション層
│   ├── CreateTask.java
│   ├── GetAllTasks.java
│   ├── UpdateTask.java
│   └── DeleteTask.java
│
├── interface_adapter/               # インターフェースアダプター
│   ├── controller/
│   │   └── TaskController.java
│   ├── presenter/
│   │   └── TaskPresenter.java
│   └── repository/
│       └── TaskRepository.java     # インターフェース
│
└── infrastructure/                  # 最も外側
    ├── persistence/
    │   ├── TaskEntity.java
    │   ├── TaskJpaRepository.java
    │   └── TaskRepositoryImpl.java
    └── config/
        └── SecurityConfig.java
```

### 実装例

**domain/entity/Task.java**

```java
package com.example.demo.domain.entity;

public class Task {
    private Long id;
    private String title;
    private boolean completed;

    public Task(Long id, String title, boolean completed) {
        validateTitle(title);
        this.id = id;
        this.title = title;
        this.completed = completed;
    }

    private void validateTitle(String title) {
        if (title == null || title.trim().isEmpty()) {
            throw new IllegalArgumentException("Title cannot be empty");
        }
    }

    public void complete() {
        if (this.completed) {
            throw new IllegalStateException("Task is already completed");
        }
        this.completed = true;
    }

    // Getters only (immutable)
    public Long getId() { return id; }
    public String getTitle() { return title; }
    public boolean isCompleted() { return completed; }
}
```

**usecase/CreateTask.java**

```java
package com.example.demo.usecase;

import com.example.demo.domain.entity.Task;
import com.example.demo.interface_adapter.repository.TaskRepository;

public class CreateTask {
    private final TaskRepository repository;

    public CreateTask(TaskRepository repository) {
        this.repository = repository;
    }

    public Task execute(String title) {
        Task task = new Task(null, title, false);
        return repository.save(task);
    }
}
```

**interface_adapter/repository/TaskRepository.java**

```java
package com.example.demo.interface_adapter.repository;

import com.example.demo.domain.entity.Task;
import java.util.List;
import java.util.Optional;

public interface TaskRepository {
    Task save(Task task);
    List<Task> findAll();
    Optional<Task> findById(Long id);
    void deleteById(Long id);
}
```

**infrastructure/persistence/TaskRepositoryImpl.java**

```java
package com.example.demo.infrastructure.persistence;

import com.example.demo.domain.entity.Task;
import com.example.demo.interface_adapter.repository.TaskRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Repository
public class TaskRepositoryImpl implements TaskRepository {
    private final TaskJpaRepository jpaRepository;

    public TaskRepositoryImpl(TaskJpaRepository jpaRepository) {
        this.jpaRepository = jpaRepository;
    }

    @Override
    public Task save(Task task) {
        TaskEntity entity = toEntity(task);
        TaskEntity saved = jpaRepository.save(entity);
        return toDomain(saved);
    }

    @Override
    public List<Task> findAll() {
        return jpaRepository.findAll().stream()
            .map(this::toDomain)
            .collect(Collectors.toList());
    }

    @Override
    public Optional<Task> findById(Long id) {
        return jpaRepository.findById(id).map(this::toDomain);
    }

    @Override
    public void deleteById(Long id) {
        jpaRepository.deleteById(id);
    }

    private TaskEntity toEntity(Task task) {
        // マッピング処理
    }

    private Task toDomain(TaskEntity entity) {
        // マッピング処理
    }
}
```

### メリット・デメリット

**メリット:**
- ビジネスロジックが完全に独立
- フレームワークを変更しても影響が最小限
- テストが非常に容易

**デメリット:**
- コード量が多い
- 学習曲線が急
- 小規模プロジェクトには過剰

### 向いているプロジェクト

- エンタープライズアプリケーション
- 長期運用（10年以上）
- 複数のプラットフォーム（Web/Mobile/Desktop）

---

## 4. オニオンアーキテクチャ

### 概要

クリーンアーキテクチャと似ているが、より依存関係を強調。

### フォルダ構成

```
backend/src/main/java/com/example/demo/
├── core/                            # 中心
│   ├── domain/
│   │   └── Task.java
│   └── service/
│       └── TaskDomainService.java
│
├── application/                     # アプリケーション層
│   ├── service/
│   │   └── TaskApplicationService.java
│   └── dto/
│       ├── CreateTaskDto.java
│       └── TaskResponseDto.java
│
├── infrastructure/                  # 外側
│   ├── persistence/
│   │   ├── TaskEntity.java
│   │   ├── TaskJpaRepository.java
│   │   └── TaskRepositoryImpl.java
│   └── web/
│       └── TaskController.java
│
└── interfaces/                      # インターフェース
    └── repository/
        └── TaskRepository.java
```

### 実装例は省略（クリーンアーキテクチャと類似）

### 向いているプロジェクト

- DDD（ドメイン駆動設計）を採用する場合
- 複雑なビジネスルールがある

---

## 5. CQRS

### 概要

Command（書き込み）とQuery（読み取り）を分離。

### フォルダ構成

```
backend/src/main/java/com/example/demo/
├── command/                         # 書き込み側
│   ├── CreateTaskCommand.java
│   ├── UpdateTaskCommand.java
│   └── handler/
│       ├── CreateTaskHandler.java
│       └── UpdateTaskHandler.java
│
├── query/                           # 読み取り側
│   ├── GetAllTasksQuery.java
│   ├── GetTaskByIdQuery.java
│   └── handler/
│       ├── GetAllTasksHandler.java
│       └── GetTaskByIdHandler.java
│
├── model/
│   ├── write/
│   │   └── Task.java
│   └── read/
│       └── TaskReadModel.java
│
└── repository/
    ├── TaskWriteRepository.java
    └── TaskReadRepository.java
```

### 実装例

**command/CreateTaskCommand.java**

```java
package com.example.demo.command;

public class CreateTaskCommand {
    private final String title;

    public CreateTaskCommand(String title) {
        this.title = title;
    }

    public String getTitle() {
        return title;
    }
}
```

**command/handler/CreateTaskHandler.java**

```java
package com.example.demo.command.handler;

import com.example.demo.command.CreateTaskCommand;
import com.example.demo.model.write.Task;
import com.example.demo.repository.TaskWriteRepository;
import org.springframework.stereotype.Service;

@Service
public class CreateTaskHandler {
    private final TaskWriteRepository repository;

    public CreateTaskHandler(TaskWriteRepository repository) {
        this.repository = repository;
    }

    public Task handle(CreateTaskCommand command) {
        Task task = new Task(null, command.getTitle(), false);
        return repository.save(task);
    }
}
```

**query/handler/GetAllTasksHandler.java**

```java
package com.example.demo.query.handler;

import com.example.demo.model.read.TaskReadModel;
import com.example.demo.repository.TaskReadRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class GetAllTasksHandler {
    private final TaskReadRepository repository;

    public GetAllTasksHandler(TaskReadRepository repository) {
        this.repository = repository;
    }

    public List<TaskReadModel> handle() {
        return repository.findAllOptimized();
    }
}
```

### メリット・デメリット

**メリット:**
- 読み取りと書き込みを別々に最適化
- スケーラビリティが高い
- イベントソーシングと相性が良い

**デメリット:**
- 複雑度が高い
- データの整合性管理が難しい

### 向いているプロジェクト

- 読み取りが非常に多いシステム
- イベント駆動アーキテクチャ
- マイクロサービス

---

## 6. 比較と選択ガイド

### プロジェクト規模別推奨

| 規模 | 推奨アーキテクチャ | 理由 |
|-----|------------------|------|
| 小規模（1-3人） | レイヤード | シンプル、学習コスト低 |
| 中規模（3-10人） | ヘキサゴナル | テストしやすい、拡張性 |
| 大規模（10人以上） | クリーン/CQRS | 複数チーム対応、長期運用 |

### 技術スタック別推奨

| 技術構成 | 推奨アーキテクチャ |
|---------|------------------|
| Spring Boot + React | レイヤード → ヘキサゴナル |
| Spring Boot + マイクロサービス | ヘキサゴナル/CQRS |
| エンタープライズ | クリーン |
| DDD採用 | オニオン |
| イベント駆動 | CQRS |

### 選択のポイント

1. **プロトタイプ・学習**: レイヤード
2. **本番環境・中規模**: ヘキサゴナル
3. **10年以上運用**: クリーン
4. **複雑なビジネスルール**: オニオン
5. **高スケーラビリティ**: CQRS

### 段階的移行

```
Phase 1: レイヤード（基本構成）
    ↓
Phase 2: サービス層追加
    ↓
Phase 3: ヘキサゴナル（ポート追加）
    ↓
Phase 4: クリーン（完全分離）
```

---

## まとめ

- **今すぐ始める**: レイヤードアーキテクチャ
- **本番環境へ**: ヘキサゴナルへ移行
- **エンタープライズ**: クリーンアーキテクチャを検討

複雑なアーキテクチャは、必要になったときに導入する。

過剰設計よりも、シンプルで理解しやすいコードの方が価値が高い。
