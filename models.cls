// ─────────────────────────────────────────────────────────────────
//  models.cls  —  Shared data schemas
// ─────────────────────────────────────────────────────────────────

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
