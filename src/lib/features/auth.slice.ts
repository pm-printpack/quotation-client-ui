import { useRequest } from "@/hooks/useRequest";
import { ActionReducerMapBuilder, PayloadAction, createAsyncThunk, createSlice } from "@reduxjs/toolkit";

const { post } = useRequest();

interface AuthState {
  isAuthenticated: boolean;
  accessToken: string;
}

const initialState: AuthState = {
  isAuthenticated: false,
  accessToken: ""
};

type LoginFormData = {
  username: string;
  password: string;
}

export const login = createAsyncThunk<void, LoginFormData>(
  "auth/login",
  async (formData: LoginFormData): Promise<void> => {
    const {data, error} = await post<LoginFormData, { accessToken: string; }>("/auth/login", formData);
    if (error) {
      throw error;
    }
    if (!data || !data.accessToken) {
      throw new Error("Cannot be verified.");
    }
    localStorage.setItem("jwtToken", data.accessToken);
  }
);

export const logout = createAsyncThunk<void, any>(
  "auth/logout",
  async (params: any, thunkApi): Promise<void> => {
  }
);

export const authSlice = createSlice({
  name: "auth",
  initialState: initialState,
  reducers: {
    setAuthenticated: (state: AuthState, action: PayloadAction<boolean>) => {
      state.isAuthenticated = action.payload;
    }
  },
  extraReducers: (builder: ActionReducerMapBuilder<AuthState>) => {
    builder.addCase(login.fulfilled, (state: AuthState) => {
      state.isAuthenticated = true;
    });
  }
});

export const {
  setAuthenticated
} = authSlice.actions;

export default authSlice.reducer;
