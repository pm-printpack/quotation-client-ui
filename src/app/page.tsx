"use client";

import { fetchAllPrintingTypes, fetchAllProductSubcategories, fetchCategoryOptions, CategoryOption, PrintingType, ProductSubcategory, CategorySuboption } from "@/lib/features/categories.slice";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { RootState } from "@/lib/store";
import { Box, Center, FieldLabel, FieldRoot, Flex, RadioCardItem, RadioCardItemHiddenInput, RadioCardItemText, RadioCardRoot, Separator, SimpleGrid, StackSeparator, TabsList, TabsRoot, TabsTrigger, Text, VStack } from "@chakra-ui/react";
import { useCallback, useEffect, useState } from "react";

export default function Home() {
  const isAuthenticated: boolean = useAppSelector((state: RootState) => state.auth.isAuthenticated);
  
  if (!isAuthenticated) {
    return undefined;
  }

  const dispatch = useAppDispatch();
  const productSubcategories: ProductSubcategory[] = useAppSelector((state: RootState) => state.categories.productSubcategories);
  const printingTypes: PrintingType[] = useAppSelector((state: RootState) => state.categories.printingTypes);
  const options: CategoryOption[] = useAppSelector((state: RootState) => state.categories.options);
  const [selectedProductSubcategoryId, setSelectedProductSubcategoryId] = useState<number>(productSubcategories[0]?.id);
  const [selectedPrintingTypeId, setSelectedPrintingTypeId] = useState<number>(printingTypes[0]?.id);

  useEffect(() => {
    dispatch(fetchAllProductSubcategories());
    dispatch(fetchAllPrintingTypes());
  }, [dispatch]);

  useEffect(() => {
    if (!selectedProductSubcategoryId) {
      setSelectedProductSubcategoryId(productSubcategories[0]?.id);
    }
  }, [selectedProductSubcategoryId, productSubcategories]);

  useEffect(() => {
    if (!selectedPrintingTypeId) {
      setSelectedPrintingTypeId(printingTypes[0]?.id);
    }
  }, [selectedPrintingTypeId, printingTypes]);

  useEffect(() => {
    if (selectedProductSubcategoryId && selectedPrintingTypeId) {
      dispatch(fetchCategoryOptions({
        categoryProductSubcategoryId: selectedProductSubcategoryId,
        categoryPrintingTypeId: selectedPrintingTypeId
      })).unwrap();
    }
  }, [selectedProductSubcategoryId, selectedPrintingTypeId]);

  const onSelectedProductSubcategoryChange = useCallback(({value}: {value: string}) => setSelectedProductSubcategoryId(Number(value)), []);

  const onSelectedPrintingTypeChange = useCallback(({value}: {value: string}) => setSelectedPrintingTypeId(Number(value)), []);

  return (
    <VStack w="100%" h="100%" p="4" align="flex-start">
      <TabsRoot
        value={`${selectedProductSubcategoryId}`}
        variant="subtle"
        onValueChange={onSelectedProductSubcategoryChange}
      >
        <TabsList>
          {
            productSubcategories.map((productSubcategory: ProductSubcategory) => (
              <TabsTrigger value={`${productSubcategory.id}`} key={`productSubcategory-${productSubcategory.id}`}>
                {productSubcategory.name}
              </TabsTrigger>
            ))
          }
        </TabsList>
      </TabsRoot>
      <Separator w="100%" />
      <TabsRoot
        value={`${selectedPrintingTypeId}`}
        variant="subtle"
        onValueChange={onSelectedPrintingTypeChange}
      >
        <TabsList>
          {
            printingTypes.map((printingType: PrintingType) => (
              <TabsTrigger value={`${printingType.id}`} key={`printingType-${printingType.id}`}>
                {printingType.name}
              </TabsTrigger>
            ))
          }
        </TabsList>
      </TabsRoot>
      <Flex w="100%" h="100%" gap="4">
        <VStack align="flex-start" flex="1" gap="4" css={{ "--field-label-width": "9.375rem" }}>
          {
            options.map((option: CategoryOption) => (
              <FieldRoot orientation="horizontal" key={`option-${option.id}`} alignItems="flex-start">
                <FieldLabel alignSelf="flex-start">
                  <Text fontWeight="bold">{option.name}:</Text>
                </FieldLabel>
                <RadioCardRoot
                  orientation="vertical"
                  align="center"
                  w="100%"
                >
                  <SimpleGrid w="100%" gap={4} templateColumns="repeat(auto-fit, minmax(10rem, 10rem))">
                    {
                      option.suboptions.map((suboption: CategorySuboption) => (
                        <RadioCardItem key={`suboption-${suboption.id}`} value={`suboption-${suboption.id}`}>
                          <RadioCardItemHiddenInput />
                          <RadioCardItemText>
                            <Center p="2" fontSize="sm">{suboption.name}</Center>
                          </RadioCardItemText>
                        </RadioCardItem>
                      ))
                    }
                  </SimpleGrid>
                </RadioCardRoot>
              </FieldRoot>
            ))
          }
        </VStack>
        <Box w="350px" bg="red.400"></Box>
      </Flex>
    </VStack>
  );
}
