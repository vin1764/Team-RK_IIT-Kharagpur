import { HashRouter, Route, Routes } from 'react-router-dom';
import { Layout } from './Layout';
import RolePicker from '../views/RolePicker';
import Landing from '../views/Landing';
import Problem from '../views/Problem';
import Categories from '../views/Categories';
import Journey from '../views/Journey';
import ControlRoom from '../views/ControlRoom';
import Economics from '../views/Economics';
import Impact from '../views/Impact';
import NotFound from '../views/NotFound';
import MakerShell from '../mvp/MakerShell';
import { AppRoutes } from '../mvp/routes';

/** Hash routing: works on any static host and when opened from a file. */
export function App() {
  return (
    <HashRouter>
      <Routes>
        <Route index element={<RolePicker />} />
        <Route path="app" element={<MakerShell />}>
          {AppRoutes()}
        </Route>
        <Route element={<Layout />}>
          <Route path="ops" element={<ControlRoom ops />} />
          <Route path="notes" element={<Landing />} />
          <Route path="problem" element={<Problem />} />
          <Route path="categories" element={<Categories />} />
          <Route path="journey/:id" element={<Journey />} />
          <Route path="control-room" element={<ControlRoom />} />
          <Route path="economics" element={<Economics />} />
          <Route path="impact" element={<Impact />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
