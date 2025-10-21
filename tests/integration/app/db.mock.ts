
export const db = <const>{
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

export type User = (typeof db.users)[number];
export type Post = (typeof db.posts)[number];

export const dbHelpers = {
  getUserById: (id: number) => db.users.find(u => u.id === id),
  getUserByUsername: (username: string) => db.users.find(u => u.username === username),
  getPostsByUserId: (userId: number) => db.posts.filter(p => p.userId === userId),
  addUser: (user: Omit<User, 'id'>) => {
    return {
      ...user,
      id: db.users.length + 1
    };
  },
  addPost: (post: any) => {
    return {
      ...post,
      id: db.posts.length + 1
    };
  }
};
