import { t } from "./i18n.js";

// Roles (the same as User.ROLES in the backend):
// user — reviews, favourites, routes, suggestions;
// moderator — also checks suggestions and removes bad reviews;
// admin — everything: places, users, roles, statistics.
export const ROLES = {
  user: t("Путешественник"),
  moderator: t("Модератор"),
  admin: t("Администратор"),
};

export const isAdmin = (user) => Boolean(user && (user.role === "admin" || user.is_staff));
export const isModerator = (user) => Boolean(user && (isAdmin(user) || user.role === "moderator"));
export const roleName = (user) => (isAdmin(user) ? ROLES.admin : ROLES[user?.role] || ROLES.user);
