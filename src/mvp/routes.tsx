import { Route } from 'react-router-dom';
import Today from './screens/Today';
import More from './screens/More';
import AppNotFound from './screens/AppNotFound';

/** Maker-app routes under /app (the shell renders the login at /app itself). */
export function AppRoutes() {
  return (
    <>
      <Route path="today" element={<Today />} />
      <Route path="more" element={<More />} />
      <Route path="*" element={<AppNotFound />} />
    </>
  );
}
