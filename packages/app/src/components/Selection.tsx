import { Select, SelectItem } from "@nextui-org/react";

interface SelectionProps<T> {
  items: T[];
  label: string;
  getKey(item: T): number | string | null;
  getLabel(item: T): string;
  getActive?(item: T): boolean;
  onChange(item: T): void;
}

export function Selection<T extends object>({
  items,
  label,
  getKey,
  getLabel,
  getActive,
  onChange,
}: SelectionProps<T>) {
  const selectedKeys: string[] = [];
  for (const item of items) {
    if (getActive?.(item)) {
      const key = getKey(item);
      selectedKeys.push(String(key));
    }
  }

  return (
    <Select
      label={label}
      items={items}
      selectionMode="single"
      selectedKeys={selectedKeys}
      onChange={(event) => {
        const item = items.find((item) => {
          const key = getKey(item);
          return String(key) === event.target.value;
        });
        if (item) {
          onChange(item);
        }
      }}
      disabled={items.length < 2}
    >
      {(item) => (
        <SelectItem key={String(getKey(item))}>{getLabel(item)}</SelectItem>
      )}
    </Select>
  );
}
