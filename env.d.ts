// env.d.ts
namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: "development" | "production" | "test"
    NEXT_PUBLIC_API_BASE: string
    // …other keys
  }
}
export {}