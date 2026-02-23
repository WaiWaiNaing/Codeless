// ─────────────────────────────────────────────────────────────────
//  handlers.cls  —  Business logic / do blocks
// ─────────────────────────────────────────────────────────────────

do ping(data) {
    return { ok: true, ts: Date.now() };
}

// DB benchmark: first 20 records from User (public, no auth) – use with seed-db.js + autocannon
do dbTest(data) {
    return sugar.query('SELECT * FROM "User" LIMIT ?', 20);
}

do login(data) {
    const users = await sugar.all('User');
    const user = users.find((u) => u.username === (data.username || data.body?.username));
    if (!user) throw Object.assign(new Error('User not found'), { status: 401 });
    return { token: signToken({ sub: user.id, username: user.username }) };
}

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
    return sugar.query(
        `SELECT p.*, u.username as authorName
         FROM "Post" p
         LEFT JOIN "User" u ON p.authorId = u.id
         ORDER BY p.id DESC`
    );
}

do createComment(data) {
    const post = sugar.find('Post', data.postId);
    if (!post) throw Object.assign(new Error('Post not found'), { status: 404 });
    return sugar.save('Comment', data);
}

do listComments(data) {
    return sugar.query(`SELECT * FROM "Comment" WHERE postId = ?`, data.postId);
}

do deletePost(data) {
    return sugar.remove('Post', data.id);
}
