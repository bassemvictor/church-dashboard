import { Input } from "../ui/input";

export const VisibilityWindowFields = ({
  visibleFrom,
  visibleUntil,
  onVisibleFromChange,
  onVisibleUntilChange,
}: {
  visibleFrom?: string;
  visibleUntil?: string;
  onVisibleFromChange: (value: string) => void;
  onVisibleUntilChange: (value: string) => void;
}) => (
  <>
    <label className="space-y-2">
      <span className="text-sm font-medium text-[#112947]">Visible from</span>
      <Input
        onChange={(event) => onVisibleFromChange(event.target.value)}
        type="date"
        value={visibleFrom ?? ""}
      />
    </label>

    <label className="space-y-2">
      <span className="text-sm font-medium text-[#112947]">Visible until</span>
      <Input
        onChange={(event) => onVisibleUntilChange(event.target.value)}
        type="date"
        value={visibleUntil ?? ""}
      />
    </label>
  </>
);
