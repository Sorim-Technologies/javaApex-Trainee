import React from "react";
import RepositoryForm from "../../components/Connect/RepositoryForm";
import type { ConnectRepositoryProps } from "../../components/Connect/ConnectTypes";

export default function Connect(props: ConnectRepositoryProps) {
  return <RepositoryForm {...props} />;
}
  