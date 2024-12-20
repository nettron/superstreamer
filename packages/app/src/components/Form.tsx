import { Button, Input } from "@nextui-org/react";
import cn from "clsx";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Controller } from "react-hook-form";
import type { InputProps } from "@nextui-org/input";
import type { Control } from "react-hook-form";

interface FormProps<T extends FieldRecord> {
  className?: string;
  fields: T;
  onSubmit(values: FieldMap<T>): void | Promise<void>;
  submit?: string;
}

type Field =
  | { type: "string"; label: string; value: string; format?: "password" }
  | { type: "number"; label: string; value: number };

type FieldRecord = Record<string, Field>;

type FieldMap<T extends FieldRecord = FieldRecord> = {
  [K in keyof T]: T[K] extends { value: infer V } ? V : never;
};

export function Form<T extends FieldRecord>({
  className,
  fields,
  onSubmit,
  submit,
}: FormProps<T>) {
  const entries = Object.entries(fields);

  const { handleSubmit, setValue, control, getValues } = useForm<FieldMap>({
    defaultValues: entries.reduce<FieldMap>((acc, [key, field]) => {
      acc[key] = field.value;
      return acc;
    }, {}),
  });

  useEffect(() => {
    const currentValues = getValues();
    Object.entries(fields).forEach(([name, field]) => {
      if (currentValues[name] !== field.value) {
        setValue(name, field.value);
      }
    });
  }, [fields]);

  return (
    <form
      onSubmit={handleSubmit((values) => {
        onSubmit(values as FieldMap<T>);
      })}
      className={cn("flex flex-col gap-4", className)}
      autoComplete="off"
    >
      {entries.map(([name, field]) => {
        let type: string | undefined;

        if (field.type === "string") {
          if (field.format === "password") {
            type = "password";
          }
        }

        return (
          <div key={name}>
            <FormInput
              name={name}
              control={control}
              label={field.label}
              type={type}
            />
          </div>
        );
      })}
      <div>
        <Button type="submit">{submit ?? "Submit"}</Button>
      </div>
    </form>
  );
}

export function FormInput({
  name,
  control,
  ...props
}: {
  name: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: Control<any, any>;
} & InputProps) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, formState }) => {
        return (
          <Input
            {...props}
            isInvalid={!!formState.errors?.[name]?.message}
            errorMessage={formState.errors?.[name]?.message?.toString()}
            value={field.value}
            onChange={field.onChange}
          />
        );
      }}
    ></Controller>
  );
}
