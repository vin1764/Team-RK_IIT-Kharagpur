import { HashRouter, Route, Routes } from 'react-router-dom';
import { Layout } from './Layout';
import Landing from '../views/Landing';
import Problem from '../views/Problem';
import Categories from '../views/Categories';
import Journey from '../views/Journey';
import ControlRoom from '../views/ControlRoom';
import Economics from '../views/Economics';
import Impact from '../views/Impact';
import NotFound from '../views/NotFound';

/** Hash routing: works on any static host and when opened from a file. */
export function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Landing />} />
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
