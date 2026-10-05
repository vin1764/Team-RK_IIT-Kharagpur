import { Route } from 'react-router-dom';
import Today from './screens/Today';
import More from './screens/More';
import Start from './screens/Start';
import CostCheck from './screens/CostCheck';
import SignUp from './screens/SignUp';
import List from './screens/List';
import Fulfilment from './screens/Fulfilment';
import Launch from './screens/Launch';
import Inbox from './screens/Inbox';
import Orders from './screens/Orders';
import PackPoint from './screens/PackPoint';
import { Products, ProductDetail } from './screens/Products';
import Coach from './screens/Coach';
import Earnings from './screens/Earnings';
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
      <Route path="inbox" element={<Inbox />} />
      <Route path="orders" element={<Orders />} />
      <Route path="packpoint" element={<PackPoint />} />
      <Route path="products" element={<Products />} />
      <Route path="products/:sku" element={<ProductDetail />} />
      <Route path="coach" element={<Coach />} />
      <Route path="earnings" element={<Earnings />} />
      <Route path="more" element={<More />} />
      <Route path="*" element={<AppNotFound />} />
    </>
  );
}
