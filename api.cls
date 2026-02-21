// ─────────────────────────────────────────────────────────────────
//  api.cls  —  Codeless v2.0 example
//  Demonstrates: optional fields, type args, enums, auth, hot reload
// ─────────────────────────────────────────────────────────────────

// ── Data Schemas ─────────────────────────────────────────────────
//  String(max:N)   → enforces max length
//  String(min:N)   → enforces min length
//  Enum(a|b|c)     → value must be one of the listed options
//  Number(min:N,max:N) → numeric range check
//  fieldName?      → field is optional (won't fail if missing)

data User {
    username: String(min:3, max:50),
    email: String(max:255),
    role: Enum(admin|editor|viewer),
    age: Number(min:0, max:150)?
}

data Post {
    title: String(min:1, max:200),
    content: String(max:5000),
    status: Enum(draft|published|archived),
    authorId: Number
}

data Comment {
    postId: Number,
    text: String(max:1000),
    author: String(max:100)?
}

// ── Business Logic ────────────────────────────────────────────────
//  Each do block receives: (data, db, sugar, req)
//  `req` is the raw Express request — use req.auth, req.params, etc.

do createUser(data) {
    return sugar.save('User', data);
}

do listUsers(data) {
    return sugar.all('User');
}

do getUser(data) {
    const id = parseInt(data.id ?? data.params?.id);
    const user = sugar.find('User', id);
    if (!user) throw Object.assign(new Error('User not found'), { status: 404 });
    return user;
}

do createPost(data) {
    return sugar.save('Post', data);
}

do listPosts(data) {
    // raw SQL example — joins are beyond sugar
    return sugar.query(
        `SELECT p.*, u.username as authorName
         FROM "Post" p
         LEFT JOIN "User" u ON p.authorId = u.id
         ORDER BY p.id DESC`
    );
}

do createComment(data) {
    // Verify the parent post exists before inserting
    const post = sugar.find('Post', data.postId);
    if (!post) throw Object.assign(new Error('Post not found'), { status: 404 });
    return sugar.save('Comment', data);
}

do listComments(data) {
    // data.postId comes from req.query or body
    return sugar.query(`SELECT * FROM "Comment" WHERE postId = ?`, data.postId);
}

do deletePost(data) {
    return sugar.remove('Post', data.id);
}

// ── Routes ────────────────────────────────────────────────────────
//  Pipeline syntax:  METHOD "path" => step1, step2, ...
//  Steps:
//    validate(Schema)  → run the schema validator, pass cleaned data forward
//    auth              → check Bearer token (401 if missing/invalid)
//    actionName        → call the do block with current context data

route {
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