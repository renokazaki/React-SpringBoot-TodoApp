# React-SpringBoot-TodoApp

** バックエンドデプロイ先にrenderを使用しているため、起動に少し時間がかかる。次タスクとしてAWSへのデプロイを試す**

フロントエンド：React
バックエンド：SpringBoot
バックエンド：supabase(postgresql)

フロントエンド：デプロイ先：vercel
バックエンドデプロイ先：render

## 一連の流れの整理
```
1. クライアント（React）
   ↓ HTTP Request (例：GET /api/tasks)
   
2. TaskController (@RestController)
   ↓ getAllTasks()メソッド呼び出し
   
3. TaskRepository (インターフェース)
   ↓ findAll()メソッド（自動生成）
   
4. Spring Data JPA
   ↓ SQLを自動生成・実行
   
5. データベース（PostgreSQL）
   ↓ 例：SELECT * FROM task
   
6. 結果をTaskオブジェクトに変換
   ↓
   
7. JSONに自動変換（Jackson）
   ↓

8. クライアントにレスポンス

```
