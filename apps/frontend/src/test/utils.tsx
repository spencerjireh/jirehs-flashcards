import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, type RenderOptions } from '@testing-library/react';
import { MemoryRouter, type MemoryRouterProps } from 'react-router-dom';
import type { ReactElement, ReactNode } from 'react';

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  routerProps?: MemoryRouterProps;
  queryClient?: QueryClient;
}

function createWrapper(queryClient: QueryClient, routerProps?: MemoryRouterProps) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter {...routerProps}>{children}</MemoryRouter>
      </QueryClientProvider>
    );
  };
}

function customRender(ui: ReactElement, options: CustomRenderOptions = {}) {
  const { routerProps, queryClient: providedClient, ...renderOptions } = options;
  const queryClient = providedClient ?? createTestQueryClient();

  return {
    ...render(ui, {
      wrapper: createWrapper(queryClient, routerProps),
      ...renderOptions,
    }),
    queryClient,
  };
}

// Re-export everything from testing-library
export * from '@testing-library/react';
export { userEvent } from '@testing-library/user-event';

// Override render with custom render
export { customRender as render };

// Wrapper factory for renderHook (which doesn't use customRender)
export function createHookWrapper(queryClient?: QueryClient) {
  const client = queryClient ?? createTestQueryClient();
  return {
    wrapper: createWrapper(client),
    queryClient: client,
  };
}
