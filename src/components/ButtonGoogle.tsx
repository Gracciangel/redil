import '../principalView.css' ;
import googleText from '../../public/icons/google-text.png'

interface ButtonGoogleProps {
    action: () => void;
}
export const ButtonGoogle = ({ action }: ButtonGoogleProps) => {
    return (
        <div className="btnGoogle-container">
            
                <img src={googleText} alt="Google Text"  onClick={action}/>
        </div>
    )
}