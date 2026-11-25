/** Payload stored in the JWT and attached to `request.user`. */
export interface AuthUser {
  sub: string;
  username: string;
}
