import { Route } from 'react-router-dom';
import Today from './screens/Today';
import More from './screens/More';
import Start from './screens/Start';
import CostCheck from './screens/CostCheck';
import SignUp from './screens/SignUp';
import List from './screens/List';
import Fulfilment from './screens/Fulfilment';
import Launch from './screens/Launch';
import AppNotFound from './screens/AppNotFound';

/** Maker-app routes under /app (the shell renders the login at /app itself). */
export function AppRoutes() {
  return (
    <>
      <Route path="today" element={<Today />} />
      <Route path="start" element={<Start />} />
      <Route path="check" element={<CostCheck />} />
      <Route path="signup" element={<SignUp />} />
      <Route path="list/:sku/fulfilment" element={<Fulfilment />} />
      <Route path="list/:sku/:step" element={<List />} />
      <Route path="launch" element={<Launch />} />
      <Route path="more" element={<More />} />
      <Route path="*" element={<AppNotFound />} />
    </>
  );
}
