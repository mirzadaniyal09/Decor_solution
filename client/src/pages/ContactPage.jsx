export default function ContactPage() {
    return (
        <div className="stack">
            <h1 className="pageTitle">Contact Information</h1>

            <div className="contactCard">
                <div className="contactRow">
                    <span className="contactLabel">Trade name</span>
                    <span className="contactValue">Decor Solution</span>
                </div>

                <div className="contactRow">
                    <span className="contactLabel">Phone number</span>
                    <span className="contactValue">0335-0496976</span>
                </div>

                <div className="contactRow">
                    <span className="contactLabel">Email</span>
                    <a className="contactValue" href="mailto:amnaamjad311@gmail.com">amnaamjad311@gmail.com</a>
                </div>

                <div className="contactRow">
                    <span className="contactLabel">Physical address</span>
                    <span className="contactValue">85F pia society, Lahore, Pakistan</span>
                </div>
            </div>
        </div>
    );
}
