import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./features/auth.slice";
import categoriesReducer from "./features/categories.slice";
import calculationReducer from "./features/calculation.slice";

export const makeStore = () => {
  return configureStore({
    reducer: {
      auth: authReducer,
      categories: categoriesReducer,
      calculation: calculationReducer
    }
  })
}

// Infer the type of makeStore
export type AppStore = ReturnType<typeof makeStore>;
// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];

