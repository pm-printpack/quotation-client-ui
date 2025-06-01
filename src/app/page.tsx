"use client";
import { fetchAllPrintingTypes, fetchAllProductSubcategories, fetchCategoryOptions, CategoryOption, PrintingType, ProductSubcategory, CategorySuboption, CategoryMaterialSuboption, hideMaterialSuboption, showMaterialSuboption1By1 } from "@/lib/features/categories.slice";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { RootState } from "@/lib/store";
import { AccordionItem, AccordionItemBody, AccordionItemContent, AccordionItemIndicator, AccordionItemTrigger, AccordionRoot, Box, Button, Center, CloseButton, FieldErrorText, FieldLabel, FieldRoot, Flex, Heading, HStack, InputGroup, NumberInputControl, NumberInputInput, NumberInputRoot, RadioCardItem, RadioCardItemHiddenInput, RadioCardItemText, RadioCardRoot, Separator, SimpleGrid, Span, StackSeparator, TabsList, TabsRoot, TabsTrigger, Text, VStack } from "@chakra-ui/react";
import { Fragment, useCallback, useEffect, useState } from "react";
import { LuPlus } from "react-icons/lu";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import styles from "./page.module.css";

type BaseCaseFormValues = {
  numOfStyles?: number;
  quantityPerStyle?: number;
  totalQuantity?: number;
} & Record<string, number>;

type FormValues = {
  width: number;
  height: number;
  cases: BaseCaseFormValues[];
};

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
  const [selectedOptionRecords, setSelectedOptionRecords] = useState<Record<number, CategoryOption<boolean>>>([]);
  const [formValues, setFormValues] = useState<FormValues>();
  const {
    control,
    handleSubmit,
    formState: { errors }
  } = useForm<FormValues>({
    defaultValues: {
      width: 1,
      height: 1,
      cases: [{
        numOfStyles: 1,
        quantityPerStyle: 100,
        totalQuantity: 1000
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

  const onAddNewBaseCase = useCallback(() => {
    appendCase({
      numOfStyles: 1,
      quantityPerStyle: 100,
      totalQuantity: 1000
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
    };
  }, [selectedOptionRecords]);

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
    };
  }, [selectedOptionRecords]);

  const onSubmit = useCallback((values: FormValues) => {
    console.log(values);
    console.log("selectedOptionRecords: ", selectedOptionRecords);
    setFormValues(values);
  }, [selectedOptionRecords]);

  const onSelectedProductSubcategoryChange = useCallback(({value}: {value: string}) => setSelectedProductSubcategoryId(Number(value)), []);

  const onSelectedPrintingTypeChange = useCallback(({value}: {value: string}) => setSelectedPrintingTypeId(Number(value)), []);

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
                direction="row"
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
                  // key={`category-option-${option.id}-sub-${suboptionIndex}`}
                  value={getSelectedValueOfMaterialSuboption(option, materialSuboption.id)}
                  onValueChange={setSelectedValueOfMaterialSuboption(option, materialSuboption.id)}
                  // value={`${field.value}`}
                  // onValueChange={setSelectedValueOfMaterialSuboption}
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
  }, []);

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
        <SimpleGrid w="full" gap={4} templateColumns="repeat(auto-fit, minmax(10rem, 10rem))">
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
  }, []);

  const renderQutationDetailPanel = useCallback((caseItem: BaseCaseFormValues, index: number) => {
    return (
      <VStack>
        <FieldRoot orientation="horizontal" w="full">
          <FieldLabel alignSelf="flex-start">
            <Text whiteSpace="nowrap" lineHeight="2.5rem">Product Name</Text>
          </FieldLabel>
          <Text whiteSpace="nowrap">{productSubcategories.find(({id}) => id === selectedProductSubcategoryId)?.name}</Text>
        </FieldRoot>
        <FieldRoot orientation="horizontal" w="full">
          <FieldLabel alignSelf="flex-start">
            <Text whiteSpace="nowrap" lineHeight="2.5rem">Printing Type</Text>
          </FieldLabel>
          <Text whiteSpace="nowrap">{printingTypes.find(({id}) => id === selectedPrintingTypeId)?.name}</Text>
        </FieldRoot>
        <FieldRoot orientation="horizontal" w="full">
          <FieldLabel alignSelf="flex-start">
            <Text whiteSpace="nowrap" lineHeight="2.5rem">Size</Text>
          </FieldLabel>
          <Text whiteSpace="nowrap">{formValues?.width || 0}mm x {formValues?.height || 0}mm</Text>
        </FieldRoot>
        <FieldRoot orientation="horizontal" w="full">
          <FieldLabel alignSelf="flex-start">
            <Text whiteSpace="nowrap" lineHeight="2.5rem">Flat Size</Text>
          </FieldLabel>
          <Text whiteSpace="nowrap">{(formValues?.height || 0) * 2}mm x {formValues?.width || 0}mm</Text>
        </FieldRoot>
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
                    <FieldRoot orientation="horizontal" w="full" key={`option-${option.id}-materialsuboption-${materialSuboption.id}-suboption-${suboption.id}`}>
                      <FieldLabel alignSelf="flex-start">
                        <Text whiteSpace="nowrap" lineHeight="2.5rem">{`${option.name}${option.suboptions.length > 1 ? ` ${index + 1}` : ""}`}</Text>
                      </FieldLabel>
                      <Text whiteSpace="nowrap">{suboption.name}</Text>
                    </FieldRoot>
                  ))
                }
              </Fragment>
              :
              null
            ))
            :
            <FieldRoot orientation="horizontal" w="full" key={`option-${option.id}`}>
              <FieldLabel alignSelf="flex-start">
                <Text whiteSpace="nowrap" lineHeight="2.5rem">{option.name}</Text>
              </FieldLabel>
              <Text whiteSpace="nowrap">{(option as CategoryOption<false>).suboptions[0].name}</Text>
            </FieldRoot>
            
          ))
        }
        <FieldRoot orientation="horizontal" w="full">
          <FieldLabel alignSelf="flex-start">
            <Text whiteSpace="nowrap" lineHeight="2.5rem">Number of Styles</Text>
          </FieldLabel>
          <Text whiteSpace="nowrap">{caseItem.numOfStyles}</Text>
        </FieldRoot>
        <FieldRoot orientation="horizontal" w="full">
          <FieldLabel alignSelf="flex-start">
            <Text whiteSpace="nowrap" lineHeight="2.5rem">Quantity per Style</Text>
          </FieldLabel>
          <Text whiteSpace="nowrap">{caseItem.quantityPerStyle}</Text>
        </FieldRoot>
        <FieldRoot orientation="horizontal" w="full">
          <FieldLabel alignSelf="flex-start">
            <Text whiteSpace="nowrap" lineHeight="2.5rem">Total Quantity</Text>
          </FieldLabel>
          <Text whiteSpace="nowrap">{caseItem.totalQuantity}</Text>
        </FieldRoot>
        <FieldRoot orientation="horizontal" w="full">
          <FieldLabel alignSelf="flex-start">
            <Text whiteSpace="nowrap" lineHeight="2.5rem">Product Quotation</Text>
          </FieldLabel>
          <Text whiteSpace="nowrap">...</Text>
        </FieldRoot>
        <FieldRoot orientation="horizontal" w="full">
          <FieldLabel alignSelf="flex-start">
            <Text whiteSpace="nowrap" lineHeight="2.5rem">Estimated Weight</Text>
          </FieldLabel>
          <Text whiteSpace="nowrap">...</Text>
        </FieldRoot>
        <FieldRoot orientation="horizontal" w="full">
          <FieldLabel alignSelf="flex-start">
            <Text whiteSpace="nowrap" lineHeight="2.5rem">Estimated Delivery Time</Text>
          </FieldLabel>
          <Text whiteSpace="nowrap">...</Text>
        </FieldRoot>
      </VStack>
    );
  }, [formValues, selectedOptionRecords]);

  return (
    <VStack w="full" h="full" p="4" align="flex-start">
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
        <VStack
          align="flex-start"
          flex="1"
          gap="4"
          as="form"
          onSubmit={handleSubmit(onSubmit)}
        >
          <VStack
            w="full"
            gap="4"
            css={{ "--field-label-width": "9.375rem" }}
            bg="bg.muted"
            paddingY="0.75rem"
            borderRadius="0.25rem"
          >
            <HStack w="full">
              <FieldRoot orientation="horizontal" justifyContent="flex-start" w="auto" invalid={!!errors.width}>
                <FieldLabel alignSelf="flex-start" justifyContent="flex-end">
                  <Text lineHeight="2.5rem">Size:</Text>
                </FieldLabel>
                <Controller
                  name="width"
                  control={control}
                  render={({ field }) => (
                    <NumberInputRoot
                      defaultValue="1"
                      min={1}
                      bg="bg.panel"
                      clampValueOnBlur={true}
                      name={field.name}
                      value={`${field.value}`}
                      onValueChange={({ valueAsNumber }) => {
                        field.onChange(valueAsNumber || 1)
                      }}
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
              <Text>x</Text>
              <FieldRoot orientation="horizontal" justifyContent="flex-start" w="auto" invalid={!!errors.height}>
                <Controller
                  name="height"
                  control={control}
                  render={({ field }) => (
                    <NumberInputRoot
                      defaultValue="1"
                      min={1}
                      bg="bg.panel"
                      clampValueOnBlur={true}
                      name={field.name}
                      value={`${field.value}`}
                      onValueChange={({ valueAsNumber }) => {
                        field.onChange(valueAsNumber || 1)
                      }}
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
            </HStack>
            {
              caseFields.map((caseField, index: number) => (
                <Box key={`base-case-${index}`} paddingX="0.75rem" w="full">
                  <VStack
                    w="full"
                    paddingY="0.75rem"
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
                    <FieldRoot orientation="horizontal" justifyContent="flex-start" w="full" invalid={!!((errors.cases || [])[index] || {}).numOfStyles}>
                      <FieldLabel alignSelf="flex-start" justifyContent="flex-end">
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
                            clampValueOnBlur={true}
                            name={field.name}
                            value={`${field.value}`}
                            onValueChange={({ valueAsNumber }) => {
                              field.onChange(valueAsNumber || 1);
                            }}
                          >
                            <NumberInputControl />
                            <NumberInputInput onBlur={field.onBlur}/>
                          </NumberInputRoot>
                        )}
                      />
                      <FieldErrorText>{(((errors.cases || [])[index] || {}).numOfStyles || "") as string}</FieldErrorText>
                    </FieldRoot>
                    <HStack w="full">
                      <FieldRoot orientation="horizontal" justifyContent="flex-start" w="auto" invalid={!!((errors.cases || [])[index] || {}).quantityPerStyle}>
                        <FieldLabel alignSelf="flex-start" justifyContent="flex-end">
                          <Text textAlign="right">Quantity per Style:</Text>
                        </FieldLabel>
                        <Controller
                          name={`cases.${index}.quantityPerStyle`}
                          control={control}
                          render={({ field }) => (
                            <NumberInputRoot
                              defaultValue={`${field.value}`}
                              min={1}
                              bg="bg.panel"
                              clampValueOnBlur={true}
                              name={field.name}
                              value={`${field.value}`}
                              onValueChange={({ valueAsNumber }) => {
                                field.onChange(valueAsNumber || 1)
                              }}
                            >
                              <NumberInputControl />
                              <InputGroup endElement={<Text lineHeight="2.5rem" paddingRight="1.5rem">PCS</Text>}>
                                <NumberInputInput onBlur={field.onBlur}/>
                              </InputGroup>
                            </NumberInputRoot>
                          )}
                        />
                        <FieldErrorText>{(((errors.cases || [])[index] || {}).quantityPerStyle || "") as string}</FieldErrorText>
                      </FieldRoot>
                      <FieldRoot orientation="horizontal" justifyContent="flex-start" w="auto" invalid={!!((errors.cases || [])[index] || {}).totalQuantity}>
                        <FieldLabel alignSelf="flex-start" justifyContent="flex-end">
                          <Text lineHeight="2.5rem">Total Quantity:</Text>
                        </FieldLabel>
                        <Controller
                          name={`cases.${index}.totalQuantity`}
                          control={control}
                          render={({ field }) => (
                            <NumberInputRoot
                              defaultValue={`${field.value}`}
                              min={1}
                              bg="bg.panel"
                              clampValueOnBlur={true}
                              name={field.name}
                              value={`${field.value}`}
                              onValueChange={({ valueAsNumber }) => {
                                field.onChange(valueAsNumber || 1)
                              }}
                            >
                              <NumberInputControl />
                              <InputGroup endElement={<Text lineHeight="2.5rem" paddingRight="1.5rem">PCS</Text>}>
                                <NumberInputInput onBlur={field.onBlur}/>
                              </InputGroup>
                            </NumberInputRoot>
                          )}
                        />
                        <FieldErrorText>{(((errors.cases || [])[index] || {}).totalQuantity || "") as string}</FieldErrorText>
                      </FieldRoot>
                    </HStack>
                    {
                      caseFields.length > 1
                      ?
                      <CloseButton size="sm" position="absolute" top="1rem" right="1rem" onClick={onDeleteBaseCase(index)}/>
                      :
                      null
                    }
                  </VStack>
                </Box>
              ))
            }
            <FieldRoot orientation="horizontal" justifyContent="flex-start" w="full">
              <FieldLabel>
                <Text textAlign="right"></Text>
              </FieldLabel>
              <Button variant="subtle" onClick={onAddNewBaseCase}>
                <LuPlus />
              </Button>
            </FieldRoot>
            <Button variant="solid" type="submit">Submit</Button>
          </VStack>
          <VStack align="flex-start" w="full" gap="4" css={{ "--field-label-width": "9.375rem" }}>
            {
              options.map((option: CategoryOption, index: number) => {
                return (
                  ((!option.isMaterial && option.suboptions.length > 0) || (option.isMaterial && option.suboptions.length > 0 && (option as CategoryOption<true>).suboptions.filter((suboption: CategoryMaterialSuboption | undefined) => suboption?.shown).length > 0))
                  ?
                  <FieldRoot orientation="horizontal" key={`option-${option.id}`} alignItems="flex-start">
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
        </VStack>
        {
          (formValues?.cases?.length && formValues?.width && formValues?.height)
          ?
          <VStack
            alignItems="flex-start"
            w="25rem"
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
          </VStack>
          :
          null
        }
      </Flex>
    </VStack>
  );
}
