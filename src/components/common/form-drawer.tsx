import type { ReactNode } from "react";

import { Button } from "../ui/button";
import { RightSideDrawer } from "./right-side-drawer";

type FormDrawerProps = {
  open: boolean;
  title: string;
  description?: string;
  submitLabel: string;
  busy?: boolean;
  onClose: () => void;
  onSubmit?: () => void;
  submitFormId?: string;
  panelClassName?: string;
  contentClassName?: string;
  children: ReactNode;
};

export const FormDrawer = ({
  open,
  title,
  description,
  submitLabel,
  busy = false,
  onClose,
  onSubmit,
  submitFormId,
  panelClassName,
  contentClassName,
  children,
}: FormDrawerProps) => (
  <RightSideDrawer
    contentClassName={contentClassName}
    description={description}
    footer={
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button onClick={onClose} type="button" variant="outline">
          Cancel
        </Button>
        <Button
          disabled={busy}
          form={submitFormId}
          onClick={submitFormId ? undefined : onSubmit}
          type={submitFormId ? "submit" : "button"}
        >
          {busy ? "Saving..." : submitLabel}
        </Button>
      </div>
    }
    onClose={onClose}
    open={open}
    panelClassName={panelClassName}
    title={title}
  >
    {children}
  </RightSideDrawer>
);
