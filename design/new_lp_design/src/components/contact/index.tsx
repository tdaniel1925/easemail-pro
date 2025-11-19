import Breacrumb from "@/common/Breacrumb";
import HeaderOne from "@/layouts/headers/HeaderOne";
import React from "react";
import Cta2Area from "../homes/home/Cta2Area";
import FooterOne from "@/layouts/footers/FooterOne";
import ContactArea from "./ContactArea";

const Contact = () => {
	return (
		<>
			<HeaderOne />
			<Breacrumb title="Contact us" subtitle="Contact" />
			<ContactArea />
			<Cta2Area />
			<FooterOne />
		</>
	);
};

export default Contact;
