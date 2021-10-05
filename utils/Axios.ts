import instance from "axios";

const API_HOST = process.env.REACT_APP_API_ENDPOINT;

const axios = instance.create({
  baseURL: API_HOST,
  timeout: 30000,
});

axios.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    let statusCode = 400;
    let errorText = "Please check your internet connection";

    if (error.response) {
      statusCode = error.response.status || 400;
      try {
        errorText = error.response.data 
      } catch (e:any) {
        errorText = e.toString();
      }
    }
    return Promise.reject({ errorText, statusCode });
  }
);

export default axios;
