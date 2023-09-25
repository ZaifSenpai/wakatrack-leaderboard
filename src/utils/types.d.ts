interface UserData {
  page: number;
  rank: number;
  user: {
    city: undefined | string;
    display_name: string;
    email: undefined | string;
    full_name: string;
    human_readable_website: string;
    id: string;
    is_email_public: boolean;
    is_hireable: boolean;
    photo: string;
    photo_public: boolean;
    username: string;
    website: string;
  };
}

interface RanksHistory {
  [username: string]: {
    date: number;
    value: number;
  }[];
}
