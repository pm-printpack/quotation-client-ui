"use client";
import styles from "./page.module.css";
import { useCallback } from "react";
import { useAppDispatch } from "@/lib/hooks";
import { login } from "@/lib/features/auth.slice";
import { Button, CardBody, CardDescription, CardFooter, CardHeader, CardRoot, CardTitle, FieldErrorText, FieldLabel, FieldRoot, Flex, Input, Stack } from "@chakra-ui/react";
import { FieldValues, Resolver, useForm } from "react-hook-form";
import { PasswordInput } from "@/components/ui/password-input";

interface FormValues {
  username: string;
  password: string;
}

const resolver: Resolver<FormValues> = async (values: FormValues) => {
  const errors: Record<string, { type: string; message: string }> = {};
  if (!values.username) {
    errors.username = {
      type: "required",
      message: "This is required.",
    };
  }
  if (!values.password) {
    errors.password = {
      type: "required",
      message: "This is required.",
    };
  }
  return {
    values: values,
    errors: errors
  }
}

export default function Login() {
  const dispath = useAppDispatch();
  const {register, handleSubmit, formState: { errors }} = useForm<FormValues>({ resolver });

  const onFinish = useCallback((values: FormValues) => {
    dispath(login(values)).unwrap();
  }, [dispath]);

  return (
    <Flex className={ styles.container } justify="center" align="center" as="form" onSubmit={handleSubmit(onFinish)}>
      <CardRoot maxW="33.75rem" className={styles.signInCard}>
        <CardHeader className={styles.signInCardHeader}>
          <CardTitle>Sign in to Quotation Client</CardTitle>
          <CardDescription></CardDescription>
        </CardHeader>
        <CardBody className={styles.signInCardBody}>
          <Stack gap="4" w="full">
            <FieldRoot invalid={!!errors?.username}>
              <FieldLabel>Username</FieldLabel>
              <Input {...register("username")} size="lg" />
              {errors?.username && <FieldErrorText>{errors.username.message}</FieldErrorText>}
            </FieldRoot>
            <FieldRoot invalid={!!errors?.password}>
              <FieldLabel>password</FieldLabel>
              <PasswordInput {...register("password")} size="lg" />
              {errors?.password && <FieldErrorText>{errors.password.message}</FieldErrorText>}
            </FieldRoot>
          </Stack>
        </CardBody>
        <CardFooter className={styles.signInCardFooter}>
          <Button variant="solid" type="submit" className={styles.signInButton}>Sign in</Button>
        </CardFooter>
      </CardRoot>
    </Flex>
  );
}