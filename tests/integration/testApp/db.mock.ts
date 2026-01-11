export type User = {
  id: number;
  username: string;
  email: string;
  password: string;
  role: 'user' | 'admin';
  createdAt: string;
};

export type Post = {
  id: number;
  userId: number;
  title: string;
  content: string;
  createdAt: string;
};

const users: User[] = [
  {
    id: 1,
    username: 'alice',
    email: 'alice@example.com',
    password: 'hashedpassword1',
    role: 'user',
    createdAt: new Date().toISOString()
  },
  {
    id: 2,
    username: 'bob',
    email: 'bob@example.com',
    password: 'hashedpassword2',
    role: 'admin',
    createdAt: new Date().toISOString()
  },
  {
    id: 3,
    username: 'charlie',
    email: 'charlie@example.com',
    password: 'hashedpassword3',
    role: 'user',
    createdAt: new Date().toISOString()
  }
];

const posts: Post[] = [
  {
    id: 1,
    userId: 1,
    title: 'Hello World',
    content: "This is Alice's first post.",
    createdAt: new Date().toISOString()
  },
  {
    id: 2,
    userId: 2,
    title: 'Admin Post',
    content: "This is Bob's admin post.",
    createdAt: new Date().toISOString()
  },
  {
    id: 3,
    userId: 1,
    title: 'Another Post',
    content: "This is Alice's second post.",
    createdAt: new Date().toISOString()
  }
];

export const db = {
  users: [...users],
  posts: [...posts]
};

export const dbHelpers = {
  getUserById: (id: number): User | undefined => {
    return db.users.find(u => u.id === id);
  },
  
  getUserByUsername: (username: string): User | undefined => {
    return db.users.find(u => u.username === username);
  },
  
  getUsersByRole: (role: 'user' | 'admin'): User[] => {
    return db.users.filter(u => u.role === role);
  },
  
  addUser: (user: Omit<User, 'id' | 'createdAt'>): User => {
    const newUser: User = {
      ...user,
      id: Math.max(...db.users.map(u => u.id), 0) + 1,
      createdAt: new Date().toISOString()
    };
    db.users.push(newUser);
    return newUser;
  },
  
  updateUser: (id: number, updates: Partial<Omit<User, 'id' | 'createdAt' | 'password'>>): User | undefined => {
    const user = db.users.find(u => u.id === id);
    if (!user) return undefined;
    Object.assign(user, updates);
    return user;
  },
  
  deleteUser: (id: number): boolean => {
    const index = db.users.findIndex(u => u.id === id);
    if (index === -1) return false;
    db.users.splice(index, 1);
    // Also delete user's posts
    db.posts = db.posts.filter(p => p.userId !== id);
    return true;
  },
  
  getPostsByUserId: (userId: number): Post[] => {
    return db.posts.filter(p => p.userId === userId);
  },
  
  getPostById: (id: number): Post | undefined => {
    return db.posts.find(p => p.id === id);
  },
  
  addPost: (post: Omit<Post, 'id' | 'createdAt'>): Post => {
    const newPost: Post = {
      ...post,
      id: Math.max(...db.posts.map(p => p.id), 0) + 1,
      createdAt: new Date().toISOString()
    };
    db.posts.push(newPost);
    return newPost;
  },
  
  deletePost: (id: number): boolean => {
    const index = db.posts.findIndex(p => p.id === id);
    if (index === -1) return false;
    db.posts.splice(index, 1);
    return true;
  },
  
  reset: () => {
    db.users = [...users];
    db.posts = [...posts];
  }
};

