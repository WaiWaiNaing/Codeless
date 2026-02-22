// ─────────────────────────────────────────────────────────────────
//  api.cls  —  Codeless v2.0 example
//  Demonstrates: optional fields, type args, enums, auth, hot reload
// ─────────────────────────────────────────────────────────────────

// Import data schemas from models.cls
import "./models.cls"

import "./handlers.cls"

// ── Routes ────────────────────────────────────────────────────────
//  Pipeline syntax:  METHOD "path" => step1, step2, ...
//  Steps:
//    validate(Schema)  → run the schema validator, pass cleaned data forward
//    auth              → check Bearer token (401 if missing/invalid)
//    actionName        → call the do block with current context data

route {
    // Auth (no auth required)
    POST   "/login"           => login
    POST   "/register"        => validate(User), createUser

    // Users — public read, auth-protected write
    GET    "/users"           => listUsers
    GET    "/users/:id"       => getUser
    POST   "/users"           => auth, validate(User), createUser

    // Posts
    GET    "/posts"           => listPosts
    POST   "/posts"           => auth, validate(Post), createPost
    DELETE "/posts/:id"       => auth, deletePost

    // Comments
    GET    "/comments"        => listComments
    POST   "/comments"        => validate(Comment), createComment
}