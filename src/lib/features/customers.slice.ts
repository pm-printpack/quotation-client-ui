import { useRequest } from "@/hooks/useRequest";
import { ActionReducerMapBuilder, createAsyncThunk, createSlice, PayloadAction, SerializedError } from "@reduxjs/toolkit";

const { get } = useRequest();

export interface CustomerTier {
  id: number;
  name: string;
  digitalPrintingProfitMargin: number;
  offsetPrintingProfitMargin: number;
  gravurePrintingProfitMargin: number;
  minimumDiscountAmount1: number;
  preferentialProfitMargin1: number;
  minimumDiscountAmount2: number;
  preferentialProfitMargin2: number;
  isArchived: boolean;
}

export interface Customer {
  id: number;
  username: string;
  name: string;
  email: string;
  orgName: string;
  phone: string;
  tier: CustomerTier;
  isArchived: boolean;
}

interface CustomersState {
  loading: boolean;
  user?: Customer;
}

const initialState: CustomersState = {
  loading: false,
  user: undefined
};

export const fetchUserById = createAsyncThunk<Customer | null | undefined, string>(
  "customers/fetchUserById",
  async (id: string): Promise<Customer | null | undefined> => {
    const {data, error} = await get<{}, Customer>(`/customers/${id}`);
    if (error) {
      throw error;
    }
    return data;
  }
);

export const customersSlice = createSlice({
  name: "customers",
  initialState: initialState,
  reducers: {
  },
  extraReducers: (builder: ActionReducerMapBuilder<CustomersState>) => {
    [fetchUserById].forEach((asyncThunk) => {
      builder.addCase(asyncThunk.pending, (state: CustomersState) => {
        state.loading = true;
      });
      builder.addCase(asyncThunk.rejected, (state: CustomersState, action: PayloadAction<unknown, string, unknown, SerializedError>) => {
        console.error("customers slice error: ", action.error);
        state.loading = false;
      });
    });
    builder.addCase(fetchUserById.fulfilled, (state: CustomersState, action: PayloadAction<Customer | null | undefined>) => {
      state.user = action.payload || undefined;
      state.loading = false;
    });
  }
});

export const {} = customersSlice.actions;

export default customersSlice.reducer;