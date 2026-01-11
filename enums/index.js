const SELLER_ACCESS = 'seller';
const ADMIN_ACCESS = 'admin';
const USER_ACCESS = 'user';
export { ADMIN_ACCESS, SELLER_ACCESS, USER_ACCESS };

export const isOnline = (lastSeen, threshold = 2) => {
  if (!lastSeen) return false;
  return Date.now() - new Date(lastSeen).getTime() < threshold * 60 * 1000;
};
export default async () => {};
