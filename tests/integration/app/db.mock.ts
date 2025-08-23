
export const db = {
  users: [
    {
      id: 1,
      username: "alice",
      email: "alice@example.com",
      password: "hashedpassword1",
      role: "user"
    },
    {
      id: 2,
      username: "bob",
      email: "bob@example.com",
      password: "hashedpassword2",
      role: "admin"
    }
  ],
  posts: [
    {
      id: 1,
      userId: 1,
      title: "Hello World",
      content: "This is Alice's first post."
    },
    {
      id: 2,
      userId: 2,
      title: "Admin Post",
      content: "This is Bob's admin post."
    }
  ]
};

export const dbHelpers = {
  getUserById: (id: number) => db.users.find(u => u.id === id),
  getUserByUsername: (username: string) => db.users.find(u => u.username === username),
  getPostsByUserId: (userId: number) => db.posts.filter(p => p.userId === userId),
  addUser: (user: any) => {
    user.id = db.users.length + 1;
    db.users.push(user);
    return user;
  },
  addPost: (post: any) => {
    post.id = db.posts.length + 1;
    db.posts.push(post);
    return post;
  }
};
