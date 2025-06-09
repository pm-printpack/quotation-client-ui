import { useRequest } from "@/hooks/useRequest";
import { ActionReducerMapBuilder, createAsyncThunk, createSlice, PayloadAction, SerializedError } from "@reduxjs/toolkit";

const {get} = useRequest();

export type ExhangeRate = {
  id: number;
  rate: number;
  baseCurrencyCode: string;
}

interface EnvironmentState {
  loading: boolean;
  exchangeRate?: ExhangeRate;
}

const initialState: EnvironmentState = {
  loading: false,
  exchangeRate: undefined
};

export const fetchExchangeRate = createAsyncThunk<ExhangeRate, void>(
  "environment/fetchExchangeRate",
  async (): Promise<ExhangeRate> => {
    const {error, data} = await get<{}, ExhangeRate>(`/exchange-rates/USD`);
    if (error) {
      throw error;
    } else if (!data) {
      throw new Error("You haven't set the exchange rate yet!");
    }
    return data;
  }
);

export const environmentSlice = createSlice({
  name: "environment",
  initialState: initialState,
  reducers: {
  },
  extraReducers: (builder: ActionReducerMapBuilder<EnvironmentState>) => {
    [fetchExchangeRate].forEach((asyncThunk) => {
      builder.addCase(asyncThunk.pending, (state: EnvironmentState) => {
        state.loading = true;
      });
      builder.addCase(asyncThunk.rejected, (state: EnvironmentState, action: PayloadAction<unknown, string, unknown, SerializedError>) => {
        console.error("environment slice error: ", action.error);
        state.loading = false;
      });
    });
    builder.addCase(fetchExchangeRate.fulfilled, (state: EnvironmentState, action: PayloadAction<ExhangeRate>) => {
      state.exchangeRate = action.payload;
      state.loading = false;
    });
  }
});

export const {
} = environmentSlice.actions;

export default environmentSlice.reducer;