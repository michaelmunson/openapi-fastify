
export const db = <const>{
  users: [
    {
      id: 1,
      username: "alice",
      email: "alice@example.com",
      password: "hashedpassword1",
      role: "user",
      createdAt: new Date().toISOString()
    },
    {
      id: 2,
      username: "bob",
      email: "bob@example.com",
      password: "hashedpassword2",
      role: "admin",
      createdAt: new Date().toISOString()
    }
  ],
  posts: [
    {
      id: 1,
      userId: 1,
      title: "Hello World",
      content: "This is Alice's first post.",
      createdAt: new Date().toISOString()
    },
    {
      id: 2,
      userId: 2,
      title: "Admin Post",
      content: "This is Bob's admin post.",
      createdAt: new Date().toISOString()
    }
  ]
};

export type User = (typeof db.users)[number];
export type Post = (typeof db.posts)[number];

export const dbHelpers = {
  getUserById: (id: number) => db.users.find(u => u.id === id),
  getUserByUsername: (username: string) => db.users.find(u => u.username === username),
  getPostsByUserId: (userId: number) => db.posts.filter(p => p.userId === userId),
  addUser: (user: Omit<User, 'id'>) => {
    return {
      ...user,
      id: db.users.length + 1,
      createdAt: new Date().toISOString()
    };
  },
  addPost: (post: any) => {
    return {
      ...post,
      id: db.posts.length + 1,
      createdAt: new Date().toISOString()
    };
  }
};
