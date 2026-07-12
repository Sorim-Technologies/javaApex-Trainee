import axios from "axios";
import { APP_BASE_URL } from "./api";

export const saveMigration = (data) => {
    return axios.post(
        `${APP_BASE_URL}/migration`,
        data
    );
};