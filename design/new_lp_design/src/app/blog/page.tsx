 
import Blog from "@/components/blog";  
import Wrapper from "@/layouts/Wrapper";

export const metadata = {
	title: "Blog Vorix - Creative Digital Agency Next js Template",
	description: "Vorix - Creative Digital Agency HTML Template",
	
};

const index = () => {
	return (
		<Wrapper>
			<Blog />
		</Wrapper>
	);
};

export default index;
