import { useRequest } from "@/hooks/useRequest";
import { ActionReducerMapBuilder, createAsyncThunk, createSlice, PayloadAction, SerializedError } from "@reduxjs/toolkit";

const {get} = useRequest();

export type ExhangeRate = {
  id: number;
  rate: number;
  baseCurrencyCode: string;
}

export enum ShippingType {
  OCEAN = "ocean",
  AIR = "air"
}

export type Shipping = {
  unitPrice: number;
  type: ShippingType
};

interface EnvironmentState {
  loading: boolean;
  exchangeRate?: ExhangeRate;
  shippings: Shipping[];
}

const initialState: EnvironmentState = {
  loading: false,
  exchangeRate: undefined,
  shippings: []
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

export const fetchShippings = createAsyncThunk<Shipping[], void>(
  "environment/fetchShippings",
  async (): Promise<Shipping[]> => {
    const {error, data} = await get<{}, Shipping[]>(`/shippings`);
    if (error) {
      throw error;
    } else if (!data) {
      throw new Error("You haven't set the shipping information yet!");
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
    [fetchExchangeRate, fetchShippings].forEach((asyncThunk) => {
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
    builder.addCase(fetchShippings.fulfilled, (state: EnvironmentState, action: PayloadAction<Shipping[]>) => {
      state.shippings = action.payload;
      state.loading = false;
    });
  }
});

export const {
} = environmentSlice.actions;

export default environmentSlice.reducer;