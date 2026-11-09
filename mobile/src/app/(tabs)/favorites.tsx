import React from 'react';
import { Screen, Heading, LoadState, LoginRequired } from '../../components/ui';
import TourCard from '../../components/tour-card';
import { useResource } from '../../hooks/use-resource';
import type { Tour } from '../../lib/types';

export default function Favorites() { return <LoginRequired next="/favorites"><FavoriteList /></LoginRequired>; }
function FavoriteList() {
  const resource = useResource<Tour[]>('/tours/me/favorites');
  return <Screen refresh={resource.refresh} refreshing={resource.loading && !!resource.data}><Heading title="Lưu lại những nơi muốn đến" subtitle="Danh sách yêu thích đồng bộ với tài khoản trên web." /><LoadState loading={resource.loading && !resource.data} error={resource.error} retry={resource.refresh} empty={!resource.loading && !resource.error && !resource.data?.length ? 'Bạn chưa lưu tour nào. Mở một tour và bấm lưu yêu thích để thêm vào đây.' : undefined} />{resource.data?.map(tour => <TourCard key={tour.id} tour={tour} />)}</Screen>;
}
