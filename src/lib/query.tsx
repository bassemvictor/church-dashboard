import {
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import {
  type PropsWithChildren,
  useState,
} from "react";

const DAY_IN_MS = 24 * 60 * 60 * 1000;

const createAppQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        gcTime: DAY_IN_MS,
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  });

export const AppQueryProvider = ({ children }: PropsWithChildren) => {
  const [queryClient] = useState(createAppQueryClient);
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};
