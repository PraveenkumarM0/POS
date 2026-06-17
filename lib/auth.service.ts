import api from "@/lib/api";

export interface LoginPayload {
  email: string;
  password: string;
}

export const loginUser = async (
  payload: LoginPayload
) => {
  const response = await api.post(
    "/auth/login",
    payload
  );

  return response.data;
};

export const pinLogin = async (
  pin: string
) => {
  const response = await api.post(
    "/auth/pin-login",
    { pin }
  );

  return response.data;
};