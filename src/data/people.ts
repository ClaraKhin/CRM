import type { Person } from './types';

export const people: Person[] = [
{
  id: 'p1',
  name: 'Ava Williams',
  email: 'ava@latticelabs.io',
  phone: '+1 415 220 1188',
  company: 'Lattice Labs',
  avatarColor: '#d8e7ff'
},
{
  id: 'p2',
  name: 'Ravi Kumar',
  email: 'ravi@harborco.com',
  phone: '+1 212 555 0142',
  company: 'Harbor & Co.',
  avatarColor: '#ffe0c2'
},
{
  id: 'p3',
  name: 'Tori Lee',
  email: 'tori@vercelink.com',
  phone: '+1 646 900 3321',
  company: 'Vercelink',
  avatarColor: '#eadbff'
},
{
  id: 'p4',
  name: 'Noah Stein',
  email: 'noah@horizon.ai',
  phone: '+1 305 771 0090',
  company: 'Horizon AI',
  avatarColor: '#c9f0e3'
},
{
  id: 'p5',
  name: 'Maya Patel',
  email: 'maya@nimbushealth.com',
  phone: '+1 617 400 8823',
  company: 'Nimbus Health',
  avatarColor: '#ffe0ee'
},
{
  id: 'p6',
  name: 'Emma Morris',
  email: 'emma@brightpath.co',
  phone: '+1 503 220 4412',
  company: 'Brightpath',
  avatarColor: '#d9e8ff'
},
{
  id: 'p7',
  name: 'James Lee',
  email: 'james@quantabase.io',
  phone: '+1 720 118 5510',
  company: 'Quantabase',
  avatarColor: '#f9dfbe'
},
{
  id: 'p8',
  name: 'Aisha Rahman',
  email: 'aisha@meridian.com',
  phone: '+1 312 664 2210',
  company: 'Meridian Group',
  avatarColor: '#e0dcff'
},
{
  id: 'p9',
  name: 'Liam Johnson',
  email: 'liam@atlascloud.io',
  phone: '+1 408 331 7788',
  company: 'Atlas Cloud',
  avatarColor: '#cfeede'
},
{
  id: 'p10',
  name: 'Sofia Garcia',
  email: 'sofia@northwind.co',
  phone: '+1 214 559 6612',
  company: 'Northwind',
  avatarColor: '#ffd9d0'
},
{
  id: 'p11',
  name: 'Kenji Sato',
  email: 'kenji@sakura.jp',
  phone: '+81 3 6712 0091',
  company: 'Sakura Systems',
  avatarColor: '#d5e3ff'
},
{
  id: 'p12',
  name: 'Olivia Brown',
  email: 'olivia@evergreen.com',
  phone: '+1 917 220 3345',
  company: 'Evergreen',
  avatarColor: '#f4dcc9'
}];


export const owners = [
{ id: 'o1', name: 'Renee Walker', color: '#ffdccb' },
{ id: 'o2', name: 'Marcus Chen', color: '#d8e7ff' },
{ id: 'o3', name: 'Priya Nair', color: '#eadbff' },
{ id: 'o4', name: 'Diego Alvarez', color: '#c9f0e3' }];


export function personById(id: string): Person {
  return people.find((p) => p.id === id) ?? people[0];
}

export function ownerById(id: string) {
  return owners.find((o) => o.id === id) ?? owners[0];
}

export function initials(name: string): string {
  return name.
  split(' ').
  map((w) => w[0]).
  slice(0, 2).
  join('');
}