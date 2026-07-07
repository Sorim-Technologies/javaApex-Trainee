import axios from "axios";

export const saveMigration = (data) => {

    return axios.post(
        "http://localhost:8001/migration",
        data
    );

};