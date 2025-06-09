"use client";
import { fetchAllPrintingTypes, fetchAllProductSubcategories, fetchCategoryOptions, CategoryOption, PrintingType, ProductSubcategory, CategorySuboption, CategoryMaterialSuboption, hideMaterialSuboption, showMaterialSuboption1By1 } from "@/lib/features/categories.slice";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { RootState } from "@/lib/store";
import { AccordionItem, AccordionItemBody, AccordionItemContent, AccordionItemIndicator, AccordionItemTrigger, AccordionRoot, Box, Button, Center, CloseButton, createOverlay, DataListItem, DataListItemLabel, DataListItemValue, DataListRoot, DrawerBackdrop, DrawerBody, DrawerContent, DrawerOpenChangeDetails, DrawerPositioner, DrawerRoot, DrawerTrigger, FieldErrorText, FieldLabel, FieldRoot, Flex, Heading, HStack, IconButton, InputGroup, Link, ListItem, ListRoot, NumberInputControl, NumberInputInput, NumberInputRoot, Portal, RadioCardItem, RadioCardItemHiddenInput, RadioCardItemText, RadioCardRoot, Separator, SimpleGrid, Span, Stack, StackProps, StackSeparator, TabsList, TabsRoot, TabsTrigger, Text, useBreakpointValue, VStack } from "@chakra-ui/react";
import { Fragment, useCallback, useEffect, useState } from "react";
import { LuPanelRightOpen, LuPlus } from "react-icons/lu";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import styles from "./page.module.css";
import { BaseCaseValue, calculateTotalPriceByDigitalPrinting, calculateTotalPriceByGravurePrinting, calculateTotalPriceByOffsetPrinting, Size } from "@/lib/features/calculation.slice";
import CalculationUtil from "./utils/CalculationUtil";
import { useDebouncedCallback } from "use-debounce";
import { fetchExchangeRate } from "@/lib/features/environment.slice";

type BaseCaseFormValues = BaseCaseValue;

type FormValues = Size & {
  cases: BaseCaseFormValues[];
};

const DEBOUNCED_WAIT_TIME: number = 250; // ms

export default function Home() {
  const isAuthenticated: boolean = useAppSelector((state: RootState) => state.auth.isAuthenticated);
  
  if (!isAuthenticated) {
    return undefined;
  }

  const dispatch = useAppDispatch();
  const isMobile: boolean | undefined = useBreakpointValue({ base: true, sm: false });
  const productSubcategories: ProductSubcategory[] = useAppSelector((state: RootState) => state.categories.productSubcategories);
  const printingTypes: PrintingType[] = useAppSelector((state: RootState) => state.categories.printingTypes);
  const options: CategoryOption[] = useAppSelector((state: RootState) => state.categories.options);
  const totalPrices: number[] = useAppSelector((state: RootState) => state.calculation.totalPrices);
  const exchangeRate: number | undefined = useAppSelector((state: RootState) => state.env.exchangeRate?.rate);
  const [selectedProductSubcategoryId, setSelectedProductSubcategoryId] = useState<number>(productSubcategories[0]?.id);
  const [selectedPrintingTypeId, setSelectedPrintingTypeId] = useState<number>(printingTypes[0]?.id);
  const [selectedOptionRecords, setSelectedOptionRecords] = useState<Record<number, CategoryOption<boolean>>>([]);
  const [formValues, setFormValues] = useState<FormValues>();
  const [productSubcategoryMenuOpen, setProductSubcategoryMenuOpen] = useState<boolean>(false);
  const [suggestedSKUs, isSuggestedSKUs] = useState<boolean[]>([]);
  const {
    control,
    handleSubmit,
    formState: { errors },
    getValues,
    setValue
  } = useForm<FormValues>({
    defaultValues: {
      width: 1,
      height: 1,
      cases: [{
        numOfStyles: 1,
        quantityPerStyle: 100,
        totalQuantity: 100
      }]
    }
  });
  const {
    fields: caseFields,
    append: appendCase,
    remove: removeCase
  } = useFieldArray({
    control,
    name: "cases"
  });

  useEffect(() => {
    dispatch(fetchExchangeRate());
    dispatch(fetchAllProductSubcategories());
    dispatch(fetchAllPrintingTypes());
  }, [dispatch]);

  useEffect(() => {
    if (!selectedProductSubcategoryId && productSubcategories.length > 0) {
      setSelectedProductSubcategoryId(productSubcategories[0].id);
    }
  }, [productSubcategories, selectedProductSubcategoryId]);

  useEffect(() => {
    if (!selectedPrintingTypeId && printingTypes.length > 0) {
      setSelectedPrintingTypeId(printingTypes[0].id);
    }
  }, [printingTypes, selectedPrintingTypeId]);

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

  const onAddNewBaseCase = useCallback(() => {
    appendCase({
      numOfStyles: 1,
      quantityPerStyle: 100,
      totalQuantity: 100
    });
  }, [appendCase]);

  const onDeleteBaseCase = useCallback((index: number) => {
    return () => {
      removeCase(index);
    };
  }, [removeCase]);

  const onAddMaterialCategorySuboption = useCallback((option: CategoryOption<true>) => {
    return () => {
      dispatch(showMaterialSuboption1By1(option.id));
    };
  }, []);

  const onDeleteMaterialCategorySuboption = useCallback((option: CategoryOption<true>, materialSuboptionId: number) => {
    return () => {
      dispatch(hideMaterialSuboption({
        optionId: option.id,
        suboptionId: materialSuboptionId
      }));
      if (selectedOptionRecords[option.id]) {
        const materialSuboptionIndex: number = (selectedOptionRecords[option.id] as CategoryOption<true>).suboptions.findIndex((materialSuboption: CategoryMaterialSuboption | undefined) => materialSuboption?.id === materialSuboptionId);
        if (materialSuboptionIndex > -1) {
          (selectedOptionRecords[option.id] as CategoryOption<true>).suboptions[materialSuboptionIndex] = undefined;
          setSelectedOptionRecords({...selectedOptionRecords});
        }
      }
    };
  }, [selectedOptionRecords]);

  const onSubmit = useCallback((values: FormValues) => {
    isSuggestedSKUs([]);
    setFormValues(undefined);
    console.log(values);
    console.log("selectedOptionRecords: ", selectedOptionRecords);
    console.log("selectedPrintingTypeId: ", selectedPrintingTypeId);
    if (values) {
      const selectedPrintingType: PrintingType | undefined = printingTypes.find((printingType: PrintingType) => printingType.id === selectedPrintingTypeId)
      if (!selectedPrintingType) {
        return;
      }
      if (selectedPrintingType.name.toLowerCase() === "digital printing") {
        dispatch(calculateTotalPriceByDigitalPrinting({
          width: values.width,
          height: values.height,
          cases: values.cases,
          options: Object.values(selectedOptionRecords)
        }));
      } else if (selectedPrintingType.name.toLowerCase() === "offset printing") {
        const {numOfMatchedModulus} = CalculationUtil.calculateNumOfMatchedModulus(values.width, values.height, Object.values(selectedOptionRecords));
        const suggests: boolean[] = values.cases.map((baseCase: BaseCaseFormValues): boolean => (
          Math.round((baseCase.numOfStyles || 0) / numOfMatchedModulus) * numOfMatchedModulus !== (baseCase.numOfStyles || 0)
        ));
        isSuggestedSKUs(suggests);
        if (suggests.find((suggestedSKU: boolean) => suggestedSKU)) {
          return;
        }
        dispatch(calculateTotalPriceByOffsetPrinting({
          width: values.width,
          height: values.height,
          cases: values.cases,
          options: Object.values(selectedOptionRecords)
        }));
      } else if (selectedPrintingType.name.toLowerCase() === "gravure printing") {
        dispatch(calculateTotalPriceByGravurePrinting({
          width: values.width,
          height: values.height,
          cases: values.cases,
          options: Object.values(selectedOptionRecords),
          selectedProductSubcategoryId: selectedProductSubcategoryId
        }));
      }
    }
    setFormValues(values);
  }, [selectedProductSubcategoryId, printingTypes, selectedPrintingTypeId, selectedOptionRecords]);

  useEffect(useDebouncedCallback(() => {
    if (!isMobile) {
      handleSubmit(onSubmit)();
    }
  }, DEBOUNCED_WAIT_TIME), [onSubmit, isMobile]);

  const getSelectedValueOfMaterialSuboption = useCallback((option: CategoryOption<true>, materialSuboptionId: number): string | undefined => {
    const selectedOption: CategoryOption | undefined = selectedOptionRecords[option.id];
    if (selectedOption) {
      const selectedMaterialOption: CategoryOption<true> = selectedOption as CategoryOption<true>;
      const selectedMaterialSuboption: CategoryMaterialSuboption | undefined = selectedMaterialOption.suboptions.find((materialSuboption: CategoryMaterialSuboption | undefined) => materialSuboption?.id === materialSuboptionId);
      if (selectedMaterialSuboption && selectedMaterialSuboption.suboptions?.length > 0) {
        return `${selectedMaterialSuboption.suboptions[0].id}`;
      }
    }
    return undefined;
  }, [selectedOptionRecords]);

  const setSelectedValueOfMaterialSuboption = useCallback((option: CategoryOption<true>, materialSuboptionId: number) => {
    return ({ value: selectedSuboptionId }: {value: string | null}) => {
      const selectedOption: CategoryOption | undefined = selectedOptionRecords[option.id];
      if (!selectedOption) {
        selectedOptionRecords[option.id] = {
          ...option,
          suboptions: []
        };
      }
      const materialSuboptionIndex: number = option.suboptions.findIndex((materialSuboption: CategoryMaterialSuboption | undefined) => materialSuboption?.id === materialSuboptionId);
      if (materialSuboptionIndex > -1) {
        const materialSuboption: CategoryMaterialSuboption | undefined = option.suboptions.find((materialSuboption: CategoryMaterialSuboption | undefined) => materialSuboption?.id === materialSuboptionId);
        if (!selectedOptionRecords[option.id].suboptions[materialSuboptionIndex] && materialSuboption) {
          selectedOptionRecords[option.id].suboptions[materialSuboptionIndex] = {
            ...materialSuboption,
            suboptions: []
          };
        }
        if (materialSuboption && materialSuboption.shown) {
          const selectedSuboption: CategorySuboption | undefined = materialSuboption.suboptions.find((suboption: CategorySuboption) => suboption.id === Number(selectedSuboptionId));
          if (selectedSuboption) {
            const selectedMaterialSuboption: CategoryMaterialSuboption | undefined = (selectedOptionRecords[option.id] as CategoryOption<true>).suboptions[materialSuboptionIndex];
            if (selectedMaterialSuboption) {
              selectedMaterialSuboption.suboptions[0] = selectedSuboption;
            }
          } else {
            selectedOptionRecords[option.id].suboptions[materialSuboptionIndex] = undefined;
          }
          setSelectedOptionRecords({...selectedOptionRecords});
        }
      }
      if (!isMobile) {
        handleSubmit(onSubmit)();
      }
    };
  }, [selectedOptionRecords, handleSubmit, onSubmit, isMobile]);

  const getSelectedValueOfNonMaterialSuboption = useCallback((option: CategoryOption<false>): string | undefined => {
    const selectedOption: CategoryOption | undefined = selectedOptionRecords[option.id];
    if (selectedOption) {
      return `${(selectedOption as CategoryOption<false>).suboptions[0].id}`;
    }
    return undefined;
  }, [selectedOptionRecords]);

  const setSelectedValueOfNonMaterialSuboption = useCallback((option: CategoryOption<false>) => {
    return ({ value: selectedSuboptionId }: {value: string | null}) => {
      let selectedOption: CategoryOption | undefined = selectedOptionRecords[option.id];
      if (!selectedOption) {
        selectedOptionRecords[option.id] = {
          ...option,
          suboptions: []
        };
      }
      if (selectedSuboptionId) {
        selectedOptionRecords[option.id].suboptions = option.suboptions.filter((suboption: CategorySuboption) => suboption.id === Number(selectedSuboptionId));
        setSelectedOptionRecords({...selectedOptionRecords});
      }
      if (!isMobile) {
        handleSubmit(onSubmit)();
      }
    };
  }, [selectedOptionRecords, handleSubmit, onSubmit, isMobile]);

  const onSelectedProductSubcategoryChange = useCallback(({value}: {value: string}) => {
    setSelectedProductSubcategoryId(Number(value));
  }, []);

  const onSelectedPrintingTypeChange = useCallback(({value}: {value: string}) => {
    setSelectedPrintingTypeId(Number(value));
  }, []);

  const renderMaterialSuboptionArea = useCallback((option: CategoryOption<true>, index: number) => {
    return (
      <VStack w="full" align="flex-start" {...(option.suboptions.length > 1 ? {bg: "bg.muted", p: "0.75rem", borderRadius: "0.25rem"} : {})}>
        {
          option.suboptions.map((materialSuboption: CategoryMaterialSuboption | undefined, suboptionIndex: number) => {
            if (!materialSuboption || !materialSuboption.shown) {
              return undefined;
            }
            return (
              <Flex
                key={`materialSuboption-${materialSuboption.id}`}
                w="full"
                direction={{base: "column", md: "row"}}
                gap="4"
                align="flex-start"
                {
                  ...(
                    option.suboptions.length > 1
                    ?
                    {
                      padding: "0.75rem",
                      borderRadius: "0.25rem",
                      position: "relative",
                      bg: "bg.emphasized",
                      css: {"--field-label-width": "8.625rem"},
                      "data-state": "open",
                      _open: {
                        animationName: "fade-in, scale-in",
                        animationDuration: "300ms"
                      },
                      _closed: {
                        animationName: "fade-out, scale-out",
                        animationDuration: "120ms"
                      }
                    }
                    :
                    {}
                  )
                }
              >
                {
                  option.suboptions.length > 1
                  ?
                  <Text textAlign="right">{`${option.name} ${suboptionIndex + 1}:`}</Text>
                  :
                  null
                }
                <RadioCardRoot
                  orientation="vertical"
                  align="center"
                  w="full"
                  variant="outline"
                  value={getSelectedValueOfMaterialSuboption(option, materialSuboption.id)}
                  onValueChange={setSelectedValueOfMaterialSuboption(option, materialSuboption.id)}
                >
                  <SimpleGrid w="full" gap={4} templateColumns="repeat(auto-fit, minmax(10rem, 10rem))">
                    {
                      materialSuboption.suboptions.map((suboption: CategorySuboption) => (
                        <RadioCardItem key={`suboption-${suboption.id}`} value={`${suboption.id}`} className={styles.radioCardItem}>
                          <RadioCardItemHiddenInput />
                          <RadioCardItemText>
                            <Center p="2" fontSize="sm">{suboption.name}</Center>
                          </RadioCardItemText>
                        </RadioCardItem>
                      ))
                    }
                  </SimpleGrid>
                </RadioCardRoot>
                {
                  option.suboptions.filter((materialSuboption: CategoryMaterialSuboption | undefined) => materialSuboption?.shown).length > 1
                  ?
                  <CloseButton size="sm" position="absolute" top="0" right="0" onClick={onDeleteMaterialCategorySuboption(option, materialSuboption.id)}/>
                  :
                  null
                }
              </Flex>
            );
          })
        }
        {
          (option.suboptions.length > 1 && option.suboptions.filter((suboption: CategoryMaterialSuboption | undefined) => suboption?.shown).length < option.suboptions.length)
          ?
          <Button variant="subtle" w="full" onClick={onAddMaterialCategorySuboption(option)}>
            <LuPlus />
          </Button>
          :
          null
        }
      </VStack>
    );
  }, [setSelectedValueOfMaterialSuboption]);

  const renderNonMaterialSuboptionArea = useCallback((option: CategoryOption<false>, index: number) => {
    return (
      <RadioCardRoot
        orientation="vertical"
        align="center"
        w="full"
        variant="outline"
        key={`category-option-${option.id}`}
        value={getSelectedValueOfNonMaterialSuboption(option)}
        onValueChange={setSelectedValueOfNonMaterialSuboption(option)}
      >
        <SimpleGrid w="full" gap={{md: 4, base: 2}} templateColumns="repeat(auto-fit, minmax(10rem, 10rem))">
          {
            option.suboptions.map((suboption: CategorySuboption) => (
              <RadioCardItem key={`suboption-${suboption.id}`} value={`${suboption.id}`} className={styles.radioCardItem}>
                <RadioCardItemHiddenInput />
                <RadioCardItemText>
                  <Center p="2" fontSize="sm">{suboption.name}</Center>
                </RadioCardItemText>
              </RadioCardItem>
            ))
          }
        </SimpleGrid>
      </RadioCardRoot>
    );
  }, [setSelectedValueOfNonMaterialSuboption]);

  const onCategoryProductSubcategoryMenuItemClick = useCallback((categoryProductSubcategoryId: number) => {
    return () => {
      setSelectedProductSubcategoryId(categoryProductSubcategoryId);
      setProductSubcategoryMenuOpen(false);
    };
  }, []);

  const renderQutationDetailPanel = useCallback((caseItem: BaseCaseFormValues, index: number) => {
    return (
      <DataListRoot orientation="horizontal">
        <DataListItem>
          <DataListItemLabel>Product Name</DataListItemLabel>
          <DataListItemValue justifyContent="flex-end">{productSubcategories.find(({id}) => id === selectedProductSubcategoryId)?.name}</DataListItemValue>
        </DataListItem>
        <DataListItem>
          <DataListItemLabel>Printing Type</DataListItemLabel>
          <DataListItemValue justifyContent="flex-end">{printingTypes.find(({id}) => id === selectedPrintingTypeId)?.name}</DataListItemValue>
        </DataListItem>
        <DataListItem>
          <DataListItemLabel>Size</DataListItemLabel>
          <DataListItemValue justifyContent="flex-end">{formValues?.width || 0}mm x {formValues?.height || 0}mm</DataListItemValue>
        </DataListItem>
        {
          Object.values(selectedOptionRecords).map((option: CategoryOption) => (
            option.isMaterial
            ?
            (option as CategoryOption<true>).suboptions.map((materialSuboption: CategoryMaterialSuboption | undefined, index: number) => (
              materialSuboption
              ?
              <Fragment key={`option-${option.id}-materialsuboption-${materialSuboption.id}`}>
                {
                  materialSuboption.suboptions.map((suboption: CategorySuboption) => (
                    <DataListItem key={`option-${option.id}-materialsuboption-${materialSuboption.id}-suboption-${suboption.id}`}>
                      <DataListItemLabel>{`${option.name}${option.suboptions.length > 1 ? ` ${index + 1}` : ""}`}</DataListItemLabel>
                      <DataListItemValue justifyContent="flex-end">{suboption.name}</DataListItemValue>
                    </DataListItem>
                  ))
                }
              </Fragment>
              :
              null
            ))
            :
            <DataListItem key={`option-${option.id}`}>
              <DataListItemLabel>{option.name}</DataListItemLabel>
              <DataListItemValue justifyContent="flex-end">{(option as CategoryOption<false>).suboptions[0].name}</DataListItemValue>
            </DataListItem>
          ))
        }
        <DataListItem>
          <DataListItemLabel>Number of Styles</DataListItemLabel>
          <DataListItemValue justifyContent="flex-end">{caseItem.numOfStyles}</DataListItemValue>
        </DataListItem>
        <DataListItem>
          <DataListItemLabel>Quantity per Style</DataListItemLabel>
          <DataListItemValue justifyContent="flex-end">{caseItem.quantityPerStyle}</DataListItemValue>
        </DataListItem>
        <DataListItem>
          <DataListItemLabel>Total Quantity</DataListItemLabel>
          <DataListItemValue justifyContent="flex-end">{caseItem.totalQuantity}</DataListItemValue>
        </DataListItem>
        <DataListItem>
          <DataListItemLabel>Product Quotation</DataListItemLabel>
          <DataListItemValue justifyContent="flex-end">
            {
              totalPrices[index]
              ?
              (
                exchangeRate
                ?
                new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(totalPrices[index] / exchangeRate)
                :
                new Intl.NumberFormat("zh-CN", { style: "currency", currency: "CNY" }).format(totalPrices[index])
              )
              :
              "-"
            }
          </DataListItemValue>
        </DataListItem>
        <DataListItem>
          <DataListItemLabel>Estimated Weight</DataListItemLabel>
          <DataListItemValue justifyContent="flex-end">...</DataListItemValue>
        </DataListItem>
        <DataListItem alignItems="flex-start">
          <DataListItemLabel>Estimated Delivery Time</DataListItemLabel>
          <DataListItemValue justifyContent="flex-end">
            Air Freight: 10–15 days
            <br />
            Sea Freight: 18–22 days
          </DataListItemValue>
        </DataListItem>
      </DataListRoot>
    );
  }, [formValues, selectedOptionRecords]);

  return (
    <VStack w="full" h="full" p={{base: "2", md: "4"}} align="flex-start">
      {
        isMobile
        ?
        <HStack w="full" justifyContent="space-between">
          <TabsRoot
            value={`${selectedProductSubcategoryId}`}
            variant="subtle"
          >
            <TabsList>
              {
                productSubcategories
                  .filter((productSubcategory: ProductSubcategory) => productSubcategory.id === selectedProductSubcategoryId)
                  .map((productSubcategory: ProductSubcategory) => (
                    <TabsTrigger flexShrink={0} value={`${productSubcategory.id}`} key={`m-productSubcategory-${productSubcategory.id}`}>
                      {productSubcategory.name}
                    </TabsTrigger>
                  ))
              }
            </TabsList>
          </TabsRoot>
          <DrawerRoot open={productSubcategoryMenuOpen} onOpenChange={(e: DrawerOpenChangeDetails) => setProductSubcategoryMenuOpen(e.open)}>
            <DrawerTrigger asChild>
              <IconButton variant="subtle" aria-label="Open Drawer" rounded="full">
                <LuPanelRightOpen />
              </IconButton>
            </DrawerTrigger>
            <Portal>
              <DrawerBackdrop>
                <DrawerPositioner>
                  <DrawerContent>
                    <DrawerBody>
                      <VStack separator={<StackSeparator />} p="4">
                        {
                          productSubcategories.map((productSubcategory: ProductSubcategory) => (
                            <Link key={`li-productSubcategory-${productSubcategory.id}`} fontSize={20} w="full" onClick={onCategoryProductSubcategoryMenuItemClick(productSubcategory.id)}>
                              <Box w="full" p="5" backgroundColor={productSubcategory.id === selectedProductSubcategoryId ? "teal.100" : "inherit"}>{productSubcategory.name}</Box>
                            </Link>
                          ))
                        }
                      </VStack>
                    </DrawerBody>
                  </DrawerContent>
                </DrawerPositioner>
              </DrawerBackdrop>
            </Portal>
          </DrawerRoot>
        </HStack>
        :
        <TabsRoot
          value={`${selectedProductSubcategoryId}`}
          variant="subtle"
          onValueChange={onSelectedProductSubcategoryChange}
        >
          <TabsList
            overflowY="hidden"
            css={{
              scrollbarWidth: "none",
              "::WebkitScrollbar": {
                display: "none"
              }
            }}
          >
            {
              productSubcategories.map((productSubcategory: ProductSubcategory) => (
                <TabsTrigger flexShrink={0} value={`${productSubcategory.id}`} key={`productSubcategory-${productSubcategory.id}`}>
                  {productSubcategory.name}
                </TabsTrigger>
              ))
            }
          </TabsList>
        </TabsRoot>
      }
      <Separator w="full" />
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
      <Flex w="full" h="full" gap="4" marginTop="0.5rem">
        {
          (isMobile && formValues)
          ?
          undefined
          :
          <VStack
            align="flex-start"
            flex="1"
            gap="4"
            w="full"
            as="form"
            onSubmit={handleSubmit(onSubmit)}
          >
            <VStack
              w="full"
              gap="4"
              css={{ "--field-label-width": "9.375rem" }}
              alignItems="flex-start"
              bg="bg.muted"
              padding="0.75rem"
              borderRadius="0.25rem"
            >
              <Stack w="full" direction={{base: "column", sm: "row"}}>
                <Text lineHeight={{sm: "2.5rem"}} w={{sm: "8.625rem"}} textAlign={{sm: "right"}}>Size:</Text>
                <FieldRoot orientation={{base: "vertical", md: "horizontal"}} justifyContent="flex-start" w="auto" invalid={!!errors.width}>
                  <Controller
                    name="width"
                    control={control}
                    render={({ field }) => (
                      <NumberInputRoot
                        defaultValue="1"
                        min={1}
                        bg="bg.panel"
                        w={{base: "full"}}
                        clampValueOnBlur={true}
                        name={field.name}
                        value={`${field.value}`}
                        onValueChange={useDebouncedCallback(({ valueAsNumber }) => {
                          field.onChange(valueAsNumber || 1);
                          if (!isMobile) {
                            handleSubmit(onSubmit)();
                          }
                        }, DEBOUNCED_WAIT_TIME)}
                      >
                        <NumberInputControl />
                        <InputGroup endElement={<Text lineHeight="2.5rem" paddingRight="1.5rem">mm</Text>}>
                          <NumberInputInput onBlur={field.onBlur}/>
                        </InputGroup>
                      </NumberInputRoot>
                    )}
                  />
                  <FieldErrorText>{errors.width?.message}</FieldErrorText>
                </FieldRoot>
                <Text alignSelf={{base: "center"}}>x</Text>
                <FieldRoot orientation={{base: "vertical", md: "horizontal"}} justifyContent="flex-start" w="auto" invalid={!!errors.height}>
                  <Controller
                    name="height"
                    control={control}
                    render={({ field }) => (
                      <NumberInputRoot
                        defaultValue="1"
                        min={1}
                        bg="bg.panel"
                        w={{base: "full"}}
                        clampValueOnBlur={true}
                        name={field.name}
                        value={`${field.value}`}
                        onValueChange={useDebouncedCallback(({ valueAsNumber }) => {
                          field.onChange(valueAsNumber || 1);
                          if (!isMobile) {
                            handleSubmit(onSubmit)();
                          }
                        }, DEBOUNCED_WAIT_TIME)}
                      >
                        <NumberInputControl />
                        <InputGroup endElement={<Text lineHeight="2.5rem" paddingRight="1.5rem">mm</Text>}>
                          <NumberInputInput onBlur={field.onBlur}/>
                        </InputGroup>
                      </NumberInputRoot>
                    )}
                  />
                  <FieldErrorText>{errors.height?.message}</FieldErrorText>
                </FieldRoot>
              </Stack>
              {
                caseFields.map((caseField, index: number) => (
                  <Box key={`base-case-${index}`} w="full">
                    <VStack
                      w="full"
                      paddingY="0.75rem"
                      paddingX={{base: "0.75rem"}}
                      borderRadius="0.25rem"
                      position="relative"
                      bg="bg.emphasized"
                      css={{ "--field-label-width": "8.625rem" }}
                      data-state="open"
                      _open={{
                        animationName: "fade-in, scale-in",
                        animationDuration: "300ms"
                      }}
                      _closed={{
                        animationName: "fade-out, scale-out",
                        animationDuration: "120ms"
                      }}
                    >
                      <FieldRoot orientation={{base: "vertical", sm: "horizontal"}} justifyContent="flex-start" w="full" invalid={suggestedSKUs[index] || !!((errors.cases || [])[index] || {}).numOfStyles}>
                        <FieldLabel alignSelf="center" justifyContent={{base: "flex-start", sm: "flex-end"}} w={{base: "full"}}>
                          <Text textAlign="right">Number of Styles in the Same Size:</Text>
                        </FieldLabel>
                        <Controller
                          name={`cases.${index}.numOfStyles`}
                          control={control}
                          render={({ field }) => (
                            <NumberInputRoot
                              defaultValue={`${field.value}`}
                              min={1}
                              bg="bg.panel"
                              w={{base: "full", md: "auto"}}
                              clampValueOnBlur={true}
                              name={field.name}
                              value={`${field.value}`}
                              onValueChange={useDebouncedCallback(({ valueAsNumber }) => {
                                field.onChange(valueAsNumber || 1);
                                setValue(`cases.${index}.totalQuantity`, getValues(`cases.${index}.numOfStyles`) * getValues(`cases.${index}.quantityPerStyle`));
                                if (!isMobile) {
                                  handleSubmit(onSubmit)();
                                }
                              }, DEBOUNCED_WAIT_TIME)}
                            >
                              <NumberInputControl />
                              <NumberInputInput onBlur={field.onBlur}/>
                            </NumberInputRoot>
                          )}
                        />
                        {
                          suggestedSKUs[index]
                          ?
                          <FieldErrorText>The optimal SKU count for the current size is a multiple of the matched modulus. Consider increasing or decreasing the SKU count for better efficiency.</FieldErrorText> 
                          :
                          null
                        }
                        <FieldErrorText>{(((errors.cases || [])[index] || {}).numOfStyles?.message || "") as string}</FieldErrorText>
                      </FieldRoot>
                      <Stack w="full" direction={{base: "column", md: "row"}}>
                        <FieldRoot orientation={{base: "vertical", sm: "horizontal"}} justifyContent="flex-start" w="auto" invalid={!!((errors.cases || [])[index] || {}).quantityPerStyle}>
                          <FieldLabel alignSelf="center" justifyContent={{base: "flex-start", sm: "flex-end"}} w={{base: "full"}}>
                            <Text>Quantity per Style:</Text>
                          </FieldLabel>
                          <Controller
                            name={`cases.${index}.quantityPerStyle`}
                            control={control}
                            render={({ field }) => (
                              <NumberInputRoot
                                defaultValue={`${field.value}`}
                                min={1}
                                bg="bg.panel"
                                w={{base: "full"}}
                                clampValueOnBlur={true}
                                name={field.name}
                                value={`${field.value}`}
                                onValueChange={useDebouncedCallback(({ valueAsNumber }) => {
                                  field.onChange(valueAsNumber || 1);
                                  setValue(`cases.${index}.totalQuantity`, getValues(`cases.${index}.numOfStyles`) * getValues(`cases.${index}.quantityPerStyle`));
                                  if (!isMobile) {
                                    handleSubmit(onSubmit)();
                                  }
                                }, DEBOUNCED_WAIT_TIME)}
                              >
                                <NumberInputControl />
                                <InputGroup endElement={<Text lineHeight="2.5rem" paddingRight="1.5rem">PCS</Text>}>
                                  <NumberInputInput onBlur={field.onBlur}/>
                                </InputGroup>
                              </NumberInputRoot>
                            )}
                          />
                          <FieldErrorText>{(((errors.cases || [])[index] || {}).quantityPerStyle?.message || "") as string}</FieldErrorText>
                        </FieldRoot>
                        <FieldRoot orientation={{base: "vertical", sm: "horizontal"}} justifyContent="flex-start" w="auto" invalid={!!((errors.cases || [])[index] || {}).totalQuantity}>
                          <FieldLabel alignSelf="center" justifyContent={{base: "flex-start", sm: "flex-end"}} w={{base: "full"}}>
                            <Text>Total Quantity:</Text>
                          </FieldLabel>
                          <Controller
                            name={`cases.${index}.totalQuantity`}
                            control={control}
                            render={({ field }) => (
                              <NumberInputRoot
                                defaultValue={`${field.value}`}
                                min={1}
                                bg="bg.panel"
                                w={{base: "full"}}
                                clampValueOnBlur={true}
                                name={field.name}
                                value={`${field.value}`}
                                disabled
                              >
                                <NumberInputControl />
                                <InputGroup endElement={<Text lineHeight="2.5rem" paddingRight="1.5rem">PCS</Text>}>
                                  <NumberInputInput onBlur={field.onBlur}/>
                                </InputGroup>
                              </NumberInputRoot>
                            )}
                          />
                          <FieldErrorText>{(((errors.cases || [])[index] || {}).totalQuantity?.message || "") as string}</FieldErrorText>
                        </FieldRoot>
                      </Stack>
                      {
                        caseFields.length > 1
                        ?
                        <CloseButton size="sm" position="absolute" top={{base: "0", md: "1rem"}} right={{base: "0", md: "1rem"}} onClick={onDeleteBaseCase(index)}/>
                        :
                        null
                      }
                    </VStack>
                  </Box>
                ))
              }
              <Button variant="subtle" marginLeft={{base: 0, sm: "9.75rem"}} w={{base: "full", sm: "auto"}} onClick={onAddNewBaseCase}>
                <LuPlus />
              </Button>
            </VStack>
            <VStack align="flex-start" w="full" gap="4" css={{ "--field-label-width": "9.375rem" }}>
              {
                options.map((option: CategoryOption, index: number) => {
                  return (
                    ((!option.isMaterial && option.suboptions.length > 0) || (option.isMaterial && option.suboptions.length > 0 && (option as CategoryOption<true>).suboptions.filter((suboption: CategoryMaterialSuboption | undefined) => suboption?.shown).length > 0))
                    ?
                    <FieldRoot orientation={{base: "vertical", md: "horizontal"}} key={`option-${option.id}`} alignItems="flex-start">
                      <FieldLabel alignSelf="flex-start" justifyContent="flex-end">
                        <Text fontWeight="bold" lineHeight="2.25rem">{option.name}:</Text>
                      </FieldLabel>
                      <VStack w="full">
                        {
                          option.isMaterial
                          ?
                          renderMaterialSuboptionArea(option as CategoryOption<true>, index)
                          :
                          renderNonMaterialSuboptionArea(option as CategoryOption<false>, index)
                        }
                      </VStack>
                    </FieldRoot>
                    :
                    null
                  );
                })
              }
            </VStack>
            <Box p="16" w="full">
              <Button variant="solid" hideFrom="md" w="full" type="submit">Submit</Button>
            </Box>
          </VStack>
        }
        {
          (formValues?.cases?.length && formValues?.width && formValues?.height)
          ?
          <VStack
            alignItems="flex-start"
            position={{base: "absolute", md: "relative"}}
            bg="bg.panel"
            top="0"
            left="0"
            right="0"
            bottom="0"
            p={{base: "1rem", md: 0}}
            w={{base: "full", md: "25rem"}}
            data-state="open"
            _open={{
              animationName: "fade-in, scale-in",
              animationDuration: "300ms"
            }}
            _closed={{
              animationName: "fade-out, scale-out",
              animationDuration: "120ms"
            }}
          >
            <Box bg="bg.muted" w="full" p="2" borderTopLeftRadius="0.25rem" borderTopRightRadius="0.25rem">
              <Heading size="md">Quotation Details for</Heading>
              <Text>
                <Span textTransform="capitalize">{printingTypes.find(({id}) => id === selectedPrintingTypeId)?.name}</Span> of <Span textTransform="capitalize">{`${productSubcategories.find(({id}) => id === selectedProductSubcategoryId)?.name}s`}</Span></Text>
            </Box>
            <AccordionRoot multiple defaultValue={Array.from(new Array(formValues.cases.length)).map((_, index: number) => `${index}`)}>
              {
                formValues.cases.length === 1
                ?
                renderQutationDetailPanel(formValues.cases[0], 0)
                :
                formValues.cases.map((caseItem: BaseCaseFormValues, index: number) => (
                  <AccordionItem key={`case-${index}`} value={`${index}`}>
                    <AccordionItemTrigger>
                      <Span flex="1">Quantity (Option {index + 1})</Span>
                      <AccordionItemIndicator />
                    </AccordionItemTrigger>
                    <AccordionItemContent>
                      <AccordionItemBody>{renderQutationDetailPanel(caseItem, index)}</AccordionItemBody>
                    </AccordionItemContent>
                  </AccordionItem>
                ))
              }
            </AccordionRoot>
            <CloseButton hideFrom="md" size="sm" position="absolute" top="1rem" right="1rem" onClick={() => setFormValues(undefined)}/>
          </VStack>
          :
          null
        }
      </Flex>
    </VStack>
  );
}
