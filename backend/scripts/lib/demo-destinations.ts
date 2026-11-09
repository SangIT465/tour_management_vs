import type { EntityManager } from 'typeorm';
import { Destination } from '../../src/modules/catalog/entities/destination.entity.js';
import { TourDestination } from '../../src/modules/catalog/entities/tour-destination.entity.js';
import { Tour } from '../../src/modules/catalog/entities/tour.entity.js';

const routes = [
  { code: 'DEMO-DNHA', places: [['Đà Nẵng', 'da-nang'], ['Hội An', 'hoi-an']] },
  { code: 'DEMO-PQ', places: [['Phú Quốc', 'phu-quoc']] },
  { code: 'DEMO-SP', places: [['Sa Pa', 'sa-pa'], ['Fansipan', 'fansipan']] },
  { code: 'DEMO-DL', places: [['Đà Lạt', 'da-lat']] },
  { code: 'DEMO-HL', places: [['Hạ Long', 'ha-long']] },
  { code: 'DEMO-NB', places: [['Ninh Bình', 'ninh-binh'], ['Hoa Lư', 'hoa-lu'], ['Tràng An', 'trang-an'], ['Hang Múa', 'hang-mua']] },
] as const;

/** Repair only missing destination links on the known demo tours. Preserve edited routes. */
export async function seedDemoDestinations(manager: EntityManager) {
  const tours = manager.getRepository(Tour);
  const destinations = manager.getRepository(Destination);
  const links = manager.getRepository(TourDestination);
  let destinationsCreated = 0;
  let linksCreated = 0;
  let toursLinked = 0;
  for (const route of routes) {
    const tour = await tours.findOneBy({ code: route.code });
    if (!tour || await links.existsBy({ tourId: tour.id })) continue;
    for (const [index, [name, slug]] of route.places.entries()) {
      let destination = await destinations.findOne({ where: [{ slug }, { name }] });
      if (!destination) {
        destination = await destinations.save(destinations.create({ name, slug }));
        destinationsCreated++;
      }
      await links.save(links.create({ tourId: tour.id, destinationId: destination.id, sortOrder: index }));
      linksCreated++;
    }
    toursLinked++;
  }
  return { destinationsCreated, linksCreated, toursLinked };
}
